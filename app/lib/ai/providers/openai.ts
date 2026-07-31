import { logAiUsage } from '../usageLog';
import { fetchWithRetry } from '../http';
import type { AIChatMessage, AIContentBlock, AIGenerateChatOptions, AIGenerateTextOptions, AIProvider } from '../types';
import { AIProviderError, type AIErrorCode } from '../errors';

// Scaffold only — Phase 0 of the OpenAI migration plan. This file is a
// complete, working AIProvider implementation, but nothing in the app
// imports or calls it yet: no route uses it, and AI_PROVIDER=openai is not
// honored by any business logic (see config.ts — resolveProviderName()
// exists, but no call site routes through it yet). It exists so the
// abstraction has a second real implementation to prove the interface
// against, and so the actual migration (a later phase) starts from a
// working base instead of an empty file.
const OPENAI_MODEL = "gpt-4o-mini";
const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

function classifyOpenAiError(status: number, errType: string, errMessage: string): { code: AIErrorCode; message: string } {
  if (status === 401 || errType === "invalid_api_key" || errType === "authentication_error") {
    return { code: 'auth', message: "AI service authentication failed — contact your administrator to check the OpenAI API key." };
  }
  if (status === 429 && /quota/i.test(errMessage)) {
    return { code: 'quota_exhausted', message: "AI service quota is exhausted — contact your administrator." };
  }
  if (status === 429) {
    return { code: 'rate_limit', message: "AI service is busy right now — please try again in a moment." };
  }
  if (status >= 500) {
    return { code: 'overloaded', message: "AI service is temporarily overloaded — please try again shortly." };
  }
  return { code: 'unknown', message: "AI service is temporarily unavailable — please try again." };
}

// OpenAI represents multimodal content differently from Anthropic's
// {type:"image", source:{...}} block — this adapts the shared
// AIContentBlock shape (app/lib/ai/types.ts) to OpenAI's
// {type:"image_url", image_url:{url}} shape.
function toOpenAiContent(content: string | AIContentBlock[]): string | Record<string, unknown>[] {
  if (typeof content === 'string') return content;
  return content.map((block) =>
    block.type === 'text'
      ? { type: 'text', text: block.text }
      : { type: 'image_url', image_url: { url: `data:${block.source.media_type};base64,${block.source.data}` } }
  );
}

async function openaiRequest(messages: Record<string, unknown>[], maxTokens: number): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AIProviderError("AI not configured", 'not_configured', 'openai');

  const start = Date.now();
  const response = await fetchWithRetry(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: OPENAI_MODEL, max_tokens: maxTokens, messages }),
  });
  const latencyMs = Date.now() - start;

  if (!response.ok) {
    let errType = "";
    let errMessage = "";
    try {
      const data = await response.json();
      errType = data?.error?.type ?? "";
      errMessage = data?.error?.message ?? "";
    } catch {
      // Response body wasn't JSON — fall through to status-code classification.
    }
    const { code, message } = classifyOpenAiError(response.status, errType, errMessage);
    logAiUsage("openai", false, message, { model: OPENAI_MODEL, latencyMs });
    throw new AIProviderError(message, code, 'openai');
  }

  const data = await response.json();
  const text = (data?.choices?.[0]?.message?.content ?? "").trim();
  if (!text) {
    logAiUsage("openai", false, "Empty AI response", { model: OPENAI_MODEL, latencyMs });
    throw new AIProviderError("Empty AI response", 'empty_response', 'openai');
  }
  logAiUsage("openai", true, undefined, {
    model: OPENAI_MODEL,
    inputTokens: data?.usage?.prompt_tokens,
    outputTokens: data?.usage?.completion_tokens,
    latencyMs,
  });
  return text;
}

async function generateText(prompt: string, options?: AIGenerateTextOptions): Promise<string> {
  return openaiRequest([{ role: 'user', content: prompt }], options?.maxTokens ?? 800);
}

function toOpenAiMessages(messages: AIChatMessage[], system?: string): Record<string, unknown>[] {
  const openAiMessages: Record<string, unknown>[] = [];
  if (system) openAiMessages.push({ role: 'system', content: system });
  for (const m of messages) {
    openAiMessages.push({ role: m.role, content: toOpenAiContent(m.content) });
  }
  return openAiMessages;
}

async function generateChat(messages: AIChatMessage[], options?: AIGenerateChatOptions): Promise<string> {
  return openaiRequest(toOpenAiMessages(messages, options?.system), options?.maxTokens ?? 800);
}

// Normalized streaming, parsing OpenAI's Chat Completions SSE shape
// (data: {"choices":[{"delta":{"content":"..."}}]}, terminated by
// "data: [DONE]") into the same plain-text-delta contract
// anthropicChatStream produces — app/lib/ai/index.ts's generateChatStream()
// doesn't need to know which provider it's talking to.
//
// options.model is intentionally NOT consulted here — see the comment on
// AIGenerateChatOptions.model in app/lib/ai/types.ts. This scaffold has
// never been called against a live OpenAI account (blocked on account
// billing/quota as of this writing) — code-complete and type-checked, not
// yet proven against real traffic the way the Anthropic path has been.
export async function* openaiChatStream(
  messages: AIChatMessage[],
  options?: AIGenerateChatOptions
): AsyncGenerator<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AIProviderError("AI not configured", 'not_configured', 'openai');

  const body: Record<string, unknown> = {
    model: OPENAI_MODEL,
    max_tokens: options?.maxTokens ?? 800,
    messages: toOpenAiMessages(messages, options?.system),
    stream: true,
  };
  if (options?.temperature !== undefined) body.temperature = options.temperature;

  const start = Date.now();
  const response = await fetchWithRetry(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const latencyMs = Date.now() - start;

  if (!response.ok || !response.body) {
    let errType = "";
    let errMessage = "";
    try {
      const data = await response.json();
      errType = data?.error?.type ?? "";
      errMessage = data?.error?.message ?? "";
    } catch {
      // Response body wasn't JSON — fall through to status-code classification.
    }
    const { code, message } = classifyOpenAiError(response.status, errType, errMessage);
    logAiUsage("openai", false, message, { model: OPENAI_MODEL, latencyMs });
    throw new AIProviderError(message, code, "openai");
  }

  // No token counts here — same reasoning as anthropicStreamRequest: OpenAI
  // only reports usage in a final SSE chunk this function doesn't consume.
  logAiUsage("openai", true, undefined, { model: OPENAI_MODEL, latencyMs });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload);
        const text = parsed?.choices?.[0]?.delta?.content;
        if (typeof text === "string" && text) yield text;
      } catch {
        // Skip unparseable SSE fragments, same tolerance as the Anthropic parser.
      }
    }
  }
}

export const openaiProvider: AIProvider = {
  name: 'openai',
  generateText,
  generateChat,
  generateChatStream: (messages, options) => openaiChatStream(messages, options),
};
