// Shared types for the provider-agnostic AI abstraction layer.
//
// This is Phase 0 of the OpenAI migration: build the abstraction, change no
// behavior. Every existing call site keeps working exactly as before (see
// providers/anthropic.ts and providers/gemini.ts) — these types only define
// the common surface that ties Anthropic, Gemini, and (soon) OpenAI together
// behind one interface, so business logic can eventually depend on
// "an AIProvider" instead of a specific vendor's SDK/REST shape.

export type AIProviderName = 'anthropic' | 'openai' | 'gemini';

export type AIChatRole = 'user' | 'assistant';

// Mirrors Anthropic's Messages API content-block shape (the only multimodal
// shape currently used anywhere in this codebase — see
// app/api/admin/quiz/analyze-photo/route.ts). Kept intentionally minimal:
// text and base64 image, nothing else, because that's all any current
// caller sends.
export type AIContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

export interface AIChatMessage {
  role: AIChatRole;
  content: string | AIContentBlock[];
}

// cacheKey/cacheTtlSeconds are opt-in: omitting cacheKey means "always
// generate fresh" (the default for anything patient/lead-specific, where
// the same-looking input shouldn't silently short-circuit a real call — see
// app/lib/ai/index.ts and app/lib/ai/cache.ts). Passing a stable cacheKey
// namespaces the cache entry per feature; the actual key also folds in a
// hash of the prompt/messages content, so different inputs never collide
// under the same cacheKey.
export interface AIGenerateTextOptions {
  maxTokens?: number;
  cacheKey?: string;
  cacheTtlSeconds?: number;
}

export interface AIGenerateChatOptions {
  system?: string;
  maxTokens?: number;
  cacheKey?: string;
  cacheTtlSeconds?: number;
  temperature?: number;
  // Provider-specific meaning: Settings.ai.model (the admin AI settings
  // dropdown) stores Claude model IDs, so only the Anthropic provider
  // currently consults this. Other providers ignore it rather than
  // forwarding a Claude model ID to an API that would reject it.
  model?: string;
}

// The common surface every provider implements. generateChatStream is
// optional — not every provider needs a real streaming implementation
// (Gemini has none in this codebase, since nothing has ever streamed
// through it); app/lib/ai/index.ts's generateChatStream() falls back to a
// single-chunk non-streaming call for any provider that omits it, so
// callers never have to special-case "does this provider stream."
export interface AIProvider {
  readonly name: AIProviderName;
  generateText(prompt: string, options?: AIGenerateTextOptions): Promise<string>;
  generateChat(messages: AIChatMessage[], options?: AIGenerateChatOptions): Promise<string>;
  generateChatStream?(messages: AIChatMessage[], options?: AIGenerateChatOptions): AsyncGenerator<string>;
}
