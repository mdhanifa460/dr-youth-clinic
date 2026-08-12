import { logAiUsage } from '../usageLog';
import { fetchWithRetry } from '../http';
import type { AIChatMessage, AIContentBlock, AIGenerateChatOptions, AIProvider } from '../types';

// Shared Anthropic call for the Content Block Builder's AI-generate actions
// (generate-summary, generate-faq, generate-benefits, etc.) and the Clinical
// Intake AI routes — each route still owns its own prompt/response-shape
// (matching this codebase's established "one route per AI action"
// convention, e.g. app/api/admin/content-blocks/improve/route.ts), but they
// all share this fetch-to-Claude mechanics rather than re-duplicating it.
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

// Every caller (admin doctor-summary/care-plan buttons, the public patient
// chat/patient-report, the Content Block Builder's AI actions) used to
// surface a raw "AI API error: 400" straight from the HTTP status code —
// meaningless to a doctor or patient, and identical whether the API key was
// wrong, the account ran out of credits, or Anthropic was just overloaded.
// This maps Anthropic's actual error payload to one clear, actionable
// message per failure class, so every AI feature site-wide gets the same
// improvement from this one shared helper rather than each route inventing
// its own wording.
async function friendlyAnthropicError(response: Response): Promise<string> {
  let errorType = "";
  let errorMessage = "";
  try {
    const data = await response.json();
    errorType = data?.error?.type ?? "";
    errorMessage = data?.error?.message ?? "";
  } catch {
    // Response body wasn't JSON (or was already consumed) — fall through
    // to a status-code-only classification below.
  }

  if (response.status === 401 || errorType === "authentication_error") {
    return "AI service authentication failed — contact your administrator to check the API key.";
  }
  if (response.status === 429 || errorType === "rate_limit_error") {
    return "AI service is busy right now — please try again in a moment.";
  }
  if (response.status === 529 || errorType === "overloaded_error") {
    return "AI service is temporarily overloaded — please try again shortly.";
  }
  if (/credit balance/i.test(errorMessage)) {
    return "AI service credits are exhausted — contact your administrator to add credits.";
  }
  return "AI service is temporarily unavailable — please try again.";
}

async function anthropicRequest(body: Record<string, unknown>): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("AI not configured");

  const model = (body.model as string | undefined) ?? ANTHROPIC_MODEL;
  const start = Date.now();
  const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: ANTHROPIC_MODEL, ...body }),
  });
  const latencyMs = Date.now() - start;

  if (!response.ok) {
    const message = await friendlyAnthropicError(response);
    logAiUsage("anthropic", false, message, { model, latencyMs });
    throw new Error(message);
  }

  const data = await response.json();
  const text = (data.content?.[0]?.text ?? "").trim();
  if (!text) {
    logAiUsage("anthropic", false, "Empty AI response", { model, latencyMs });
    throw new Error("Empty AI response");
  }
  logAiUsage("anthropic", true, undefined, {
    model,
    inputTokens: data.usage?.input_tokens,
    outputTokens: data.usage?.output_tokens,
    latencyMs,
  });
  return text;
}

export async function callClaude(prompt: string, maxTokens = 800): Promise<string> {
  return anthropicRequest({ max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] });
}

// Returns the raw upstream Response (stream: true) for callers that need to
// forward Anthropic's own SSE stream to their client (e.g. the AI chat
// widget's token-by-token typing effect) rather than waiting for the full
// completion — anthropicRequest() above always awaits a complete response,
// which would remove that streaming UX, so this is a separate entry point
// rather than a mode flag on the same function.
//
// Not part of the AIProvider interface (see app/lib/ai/types.ts) — this
// returns Anthropic's raw SSE event shape, which the only caller
// (app/api/ai-chat/route.ts) parses directly. Abstracting streaming across
// providers is out of scope for this migration phase.
export async function anthropicStreamRequest(body: Record<string, unknown>): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("AI not configured");

  const model = (body.model as string | undefined) ?? ANTHROPIC_MODEL;
  const start = Date.now();
  const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: ANTHROPIC_MODEL, ...body, stream: true }),
  });
  const latencyMs = Date.now() - start;

  // Only the initial handshake is logged here — the caller streams the body
  // token-by-token to its own client, so a per-token success/failure isn't
  // observable from this side without consuming (and thus breaking) that
  // stream. A failed handshake (bad key, rate limit, overload) is exactly
  // the failure mode this log exists to catch, so it's still worth logging.
  // No token counts here for the same reason — Anthropic's usage totals
  // only arrive in the final SSE event, which this function doesn't read.
  if (!response.ok) {
    const message = await friendlyAnthropicError(response.clone());
    logAiUsage("anthropic", false, message, { model, latencyMs });
  } else {
    logAiUsage("anthropic", true, undefined, { model, latencyMs });
  }

  return response;
}

// Kept as a named export for backward compatibility with any existing
// import of this type — it's now just an alias for the shared
// provider-agnostic content-block shape in app/lib/ai/types.ts.
export type AnthropicContentBlock = AIContentBlock;

// For callers that need a system prompt, multi-turn conversation history, or
// multi-part content (e.g. an image alongside text) — callClaude's single
// prompt string isn't enough for the Clinical Intake chat/photo-triage routes.
export async function callClaudeMessages(opts: {
  messages: AIChatMessage[];
  system?: string;
  maxTokens?: number;
}): Promise<string> {
  return anthropicRequest({
    max_tokens: opts.maxTokens ?? 800,
    ...(opts.system ? { system: opts.system } : {}),
    messages: opts.messages,
  });
}

// Claude occasionally emits a literal raw newline/tab inside a JSON string
// value instead of the escaped "\n"/"\t" the spec requires — e.g.
// {"detail": "First sentence.
// Second sentence."} — which JSON.parse rejects as "Bad control character
// in string literal". A blind global replace of every raw newline in the
// text would corrupt the JSON structure itself (indentation whitespace
// between tokens is meaningful to look at, even though insignificant to
// parse) — a stray inserted "\n" two-character sequence OUTSIDE a string
// is invalid syntax. This scans char-by-char tracking whether we're
// inside a quoted string (respecting backslash-escaped quotes) and only
// escapes control characters found there; whitespace between structural
// tokens outside strings is left exactly as-is, since raw whitespace there
// is already valid per the JSON spec.
function sanitizeJsonControlChars(text: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
      } else if (ch === "\\") {
        out += ch;
        escaped = true;
      } else if (ch === '"') {
        out += ch;
        inString = false;
      } else if (ch === "\n") {
        out += "\\n";
      } else if (ch === "\r") {
        out += "\\r";
      } else if (ch === "\t") {
        out += "\\t";
      } else if (ch.charCodeAt(0) < 0x20) {
        out += "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0");
      } else {
        out += ch;
      }
    } else {
      if (ch === '"') inString = true;
      out += ch;
    }
  }
  return out;
}

// Strips ```json fences some responses get wrapped in, AND extracts just
// the {...} substring — Claude sometimes adds prose before/after the JSON
// block despite being told "return ONLY valid JSON" (e.g. a trailing
// "### Critical Summary for Leadership" section after the closing fence).
// Taking the first "{" to the last "}" in the whole text handles both the
// fenced and unfenced cases in one pass, and is safe here specifically
// because every prompt using this parser asks for a single top-level JSON
// object, not an array or bare value.
//
// Every one of this function's 12 callers (patient-report, 7 content-block
// generators, 4 video generators) wraps this call in its own try/catch and
// forwards err.message straight into the API response — none of them
// expected JSON.parse's native SyntaxError specifically, so a truncated or
// malformed AI response (Claude cut off mid-array on a large structured
// reply, same root cause as the fix in app/api/admin/intelligence/ai and
// app/api/journey-simulator, which now both route through this same
// function too) surfaced a raw "Expected ',' or ']' after array element in
// JSON at position N" straight to a real user. Catching it once here, at
// the single shared choke point, fixes every caller and any future one —
// patching each call site individually would leave the same gap open the
// next time a route is added.
export function parseClaudeJson<T>(text: string): T {
  const fenceStripped = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const braceMatch = fenceStripped.match(/\{[\s\S]*\}/);
  const cleaned = braceMatch ? braceMatch[0] : fenceStripped;
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // First attempt failed — try again after repairing the specific "raw
    // control character inside a string" quirk before giving up entirely.
    try {
      return JSON.parse(sanitizeJsonControlChars(cleaned)) as T;
    } catch {
      throw new Error("The AI response was incomplete or malformed — please try again.");
    }
  }
}

// Normalized streaming: parses Anthropic's SSE event shape
// (content_block_delta / delta.text_delta) once, here, instead of every
// caller re-implementing it — this is the exact parsing logic that used to
// live inline in app/api/ai-chat/route.ts before the abstraction layer,
// moved rather than rewritten. Yields plain text deltas; anything that
// isn't a text delta (thinking blocks, tool-use events — none of which
// this codebase uses) is silently skipped, same as before.
//
// options.model is Anthropic-specific here: Settings.ai.model (the admin
// dropdown) stores Claude model IDs, so it's meaningful to pass through as
// an override on this provider specifically. Other providers ignore it —
// see providers/openai.ts.
export async function* anthropicChatStream(
  messages: AIChatMessage[],
  options?: AIGenerateChatOptions & { temperature?: number; model?: string }
): AsyncGenerator<string> {
  const body: Record<string, unknown> = {
    max_tokens: options?.maxTokens ?? 500,
    messages,
  };
  if (options?.system) body.system = options.system;
  if (options?.temperature !== undefined) body.temperature = options.temperature;
  if (options?.model) body.model = options.model;

  const upstream = await anthropicStreamRequest(body);
  if (!upstream.ok || !upstream.body) {
    console.error("[anthropicChatStream] stream connection failed", upstream.status);
    const message = upstream.ok
      ? "AI service is temporarily unavailable — please try again."
      : await friendlyAnthropicError(upstream.clone());
    throw new Error(message);
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const evt of events) {
      const dataLine = evt.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      const jsonStr = dataLine.slice(5).trim();
      if (!jsonStr) continue;
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
          yield parsed.delta.text as string;
        }
      } catch {
        // Skip unparseable SSE fragments (e.g. ping events) rather than aborting the stream.
      }
    }
  }
}

// The AIProvider-shaped entry point — what app/lib/ai/index.ts's
// provider-agnostic resolver uses. callClaude/callClaudeMessages above are
// unaffected by this and keep their own direct implementation: they name
// Claude specifically and must always call Claude specifically regardless
// of the AI_PROVIDER env var, so they're not routed through the swappable
// resolver (see app/lib/ai/config.ts for why).
export const anthropicProvider: AIProvider = {
  name: 'anthropic',
  generateText: (prompt, options) => callClaude(prompt, options?.maxTokens),
  generateChat: (messages, options) =>
    callClaudeMessages({ messages, system: options?.system, maxTokens: options?.maxTokens }),
  generateChatStream: (messages, options) => anthropicChatStream(messages, options),
};
