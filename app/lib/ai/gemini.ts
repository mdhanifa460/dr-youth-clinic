// Thin re-export layer — see app/lib/ai/anthropic.ts for why this file is
// kept as a stable import path instead of requiring callers to update.
// The real implementation now lives in providers/gemini.ts.
export { callGeminiText, embedGeminiText } from './providers/gemini';
