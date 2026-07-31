// Thin re-export layer — the real implementation now lives in
// providers/anthropic.ts as part of the provider-agnostic AI abstraction
// (see app/lib/ai/index.ts and app/lib/ai/types.ts). This file is kept in
// place, with the exact same exports it always had, purely so the ~20
// existing route files that import from "@/app/lib/ai/anthropic" don't
// need to change a single line — same functions, same signatures, same
// behavior.
export { callClaude, callClaudeMessages, anthropicStreamRequest, parseClaudeJson } from './providers/anthropic';
export type { AnthropicContentBlock } from './providers/anthropic';
