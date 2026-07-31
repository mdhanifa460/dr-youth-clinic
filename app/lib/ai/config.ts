import type { AIProviderName } from './types';

const VALID_PROVIDERS: readonly AIProviderName[] = ['anthropic', 'openai', 'gemini'];

// Resolves which provider app/lib/ai/index.ts's provider-agnostic
// generateText()/generateChat() use.
//
// This does NOT affect callClaude/callClaudeMessages/anthropicStreamRequest
// (app/lib/ai/providers/anthropic.ts) or callGeminiText/embedGeminiText
// (app/lib/ai/providers/gemini.ts) — those are named by provider on
// purpose and always call that exact provider, regardless of this env var.
// A route that imports "callClaude" is asking for Claude specifically, not
// "whichever provider AI_PROVIDER points at today"; routing it through this
// resolver would silently change what a differently-named function does.
// This resolver only matters once a call site is rewritten to depend on the
// generic AIProvider interface instead of a named function — which no
// route does yet (Phase 0 builds the abstraction; it doesn't adopt it).
export function getConfiguredProviderName(): AIProviderName {
  const raw = (process.env.AI_PROVIDER || 'anthropic').trim().toLowerCase();
  return (VALID_PROVIDERS as readonly string[]).includes(raw) ? (raw as AIProviderName) : 'anthropic';
}

const PROVIDER_ENV_KEY: Record<AIProviderName, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
};

// A few routes pre-flight-check for a configured key before building a
// prompt (rather than just letting generateText() throw "AI not
// configured" once called) so they can return a specific status code/
// message. Those routes used to hardcode `process.env.ANTHROPIC_API_KEY` —
// correct only while every route was pinned to Claude. Now that some routes
// call the swappable facade, the pre-check needs to name whichever
// provider AI_PROVIDER actually points at, or it would incorrectly block
// (or incorrectly allow) requests once a route isn't running on Anthropic.
export function getConfiguredProviderEnvKeyName(): string {
  return PROVIDER_ENV_KEY[getConfiguredProviderName()];
}

export function isConfiguredProviderReady(): boolean {
  return !!process.env[getConfiguredProviderEnvKeyName()];
}
