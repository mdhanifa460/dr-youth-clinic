import type { AIChatMessage, AIGenerateChatOptions, AIGenerateTextOptions, AIProvider, AIProviderName } from './types';
import { getConfiguredProviderName } from './config';
import { anthropicProvider } from './providers/anthropic';
import { geminiProvider } from './providers/gemini';
import { openaiProvider } from './providers/openai';
import { buildCacheKey, getCached, setCached } from './cache';

// Default TTL for cached AI responses when a call site opts in via
// cacheKey but doesn't specify its own cacheTtlSeconds. One hour balances
// "don't pay twice for an accidental double-click or duplicate topic" against
// "content generation should still feel fresh within the same work session."
// Individual call sites override this where a different tradeoff makes
// sense (see the routes that pass cacheTtlSeconds explicitly).
const DEFAULT_CACHE_TTL_SECONDS = 3600;

// The AI abstraction layer's public entry point. This is the only file
// business logic should import from once a route is migrated to be
// provider-agnostic (no route is migrated yet — see config.ts).
//
// Existing named imports (callClaude, callClaudeMessages,
// anthropicStreamRequest, parseClaudeJson from '@/app/lib/ai/anthropic';
// callGeminiText, embedGeminiText from '@/app/lib/ai/gemini') are untouched
// and keep working exactly as before — they're thin re-exports of the same
// implementations that back anthropicProvider/geminiProvider below, just
// addressed by provider name instead of through this resolver.
const PROVIDERS: Record<AIProviderName, AIProvider> = {
  anthropic: anthropicProvider,
  gemini: geminiProvider,
  openai: openaiProvider,
};

export function getAIProvider(): AIProvider {
  return PROVIDERS[getConfiguredProviderName()];
}

export async function generateText(prompt: string, options?: AIGenerateTextOptions): Promise<string> {
  if (!options?.cacheKey) {
    return getAIProvider().generateText(prompt, options);
  }

  const redisKey = buildCacheKey(options.cacheKey, {
    provider: getConfiguredProviderName(),
    prompt,
    maxTokens: options.maxTokens,
  });
  const cached = await getCached(redisKey);
  if (cached !== null) return cached;

  const result = await getAIProvider().generateText(prompt, options);
  await setCached(redisKey, result, options.cacheTtlSeconds ?? DEFAULT_CACHE_TTL_SECONDS);
  return result;
}

export async function generateChat(messages: AIChatMessage[], options?: AIGenerateChatOptions): Promise<string> {
  if (!options?.cacheKey) {
    return getAIProvider().generateChat(messages, options);
  }

  const redisKey = buildCacheKey(options.cacheKey, {
    provider: getConfiguredProviderName(),
    messages,
    system: options.system,
    maxTokens: options.maxTokens,
  });
  const cached = await getCached(redisKey);
  if (cached !== null) return cached;

  const result = await getAIProvider().generateChat(messages, options);
  await setCached(redisKey, result, options.cacheTtlSeconds ?? DEFAULT_CACHE_TTL_SECONDS);
  return result;
}

// Normalized streaming across providers. Falls back to a single-chunk
// "non-streaming" call for any provider that doesn't implement
// generateChatStream (e.g. Gemini today) — callers that just want to
// iterate deltas never need to know or check which provider is active.
// Not cached (see generateText/generateChat above) — the chat widget's
// responses are conversational and shouldn't be replayed verbatim to a
// different visitor asking something that happens to hash the same.
export async function* generateChatStream(
  messages: AIChatMessage[],
  options?: AIGenerateChatOptions
): AsyncGenerator<string> {
  const provider = getAIProvider();
  if (provider.generateChatStream) {
    yield* provider.generateChatStream(messages, options);
    return;
  }
  const result = await provider.generateChat(messages, options);
  yield result;
}

export { getConfiguredProviderName, getConfiguredProviderEnvKeyName, isConfiguredProviderReady } from './config';
export { AIProviderError } from './errors';
export type { AIErrorCode } from './errors';
export type { AIChatMessage, AIChatRole, AIContentBlock, AIGenerateChatOptions, AIGenerateTextOptions, AIProvider, AIProviderName } from './types';
