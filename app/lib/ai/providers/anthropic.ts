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

// Strips ```json fences some responses get wrapped in despite the prompt
// asking for raw JSON — cheap insurance before JSON.parse.
export function parseClaudeJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned) as T;
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
