// Shared Anthropic call for the Content Block Builder's AI-generate actions
// (generate-summary, generate-faq, generate-benefits, etc.) and the Clinical
// Intake AI routes — each route still owns its own prompt/response-shape
// (matching this codebase's established "one route per AI action"
// convention, e.g. app/api/admin/content-blocks/improve/route.ts), but they
// all share this fetch-to-Claude mechanics rather than re-duplicating it.
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

async function anthropicRequest(body: Record<string, unknown>): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("AI not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: ANTHROPIC_MODEL, ...body }),
  });

  if (!response.ok) throw new Error(`AI API error: ${response.status}`);

  const data = await response.json();
  const text = (data.content?.[0]?.text ?? "").trim();
  if (!text) throw new Error("Empty AI response");
  return text;
}

export async function callClaude(prompt: string, maxTokens = 800): Promise<string> {
  return anthropicRequest({ max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] });
}

export type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

// For callers that need a system prompt, multi-turn conversation history, or
// multi-part content (e.g. an image alongside text) — callClaude's single
// prompt string isn't enough for the Clinical Intake chat/photo-triage routes.
export async function callClaudeMessages(opts: {
  messages: { role: "user" | "assistant"; content: string | AnthropicContentBlock[] }[];
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
