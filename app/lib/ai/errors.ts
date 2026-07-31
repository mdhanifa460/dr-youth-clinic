import type { AIProviderName } from './types';

// A typed error class so callers that want to branch on failure class can
// do so on `.code` instead of parsing the human-readable message string.
//
// Existing providers (Anthropic, Gemini) keep throwing plain `Error` with
// the exact same user-facing message strings they always have — adopting
// AIProviderError there is deliberately out of scope for Phase 0. Changing
// an already-working, already-tested error path carries real risk for zero
// Phase-0 benefit (nothing reads `.code` yet), so it's left as follow-up
// work. New provider code (the OpenAI scaffold) uses it from the start
// since there's no existing behavior to preserve there.
export type AIErrorCode =
  | 'not_configured'
  | 'auth'
  | 'rate_limit'
  | 'overloaded'
  | 'quota_exhausted'
  | 'empty_response'
  | 'unknown';

export class AIProviderError extends Error {
  readonly code: AIErrorCode;
  readonly provider: AIProviderName;

  constructor(message: string, code: AIErrorCode, provider: AIProviderName) {
    super(message);
    this.name = 'AIProviderError';
    this.code = code;
    this.provider = provider;
  }
}
