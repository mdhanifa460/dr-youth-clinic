import { connectDB } from '@/app/lib/mongodb';
import { AiUsageLog } from '@/app/models/AiUsageLog';
import type { AIProviderName } from './types';

export interface AiUsageMetrics {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
}

// Manually maintained — NOT fetched from any provider billing API. Prices
// change without notice, so this table will drift; that's why every cost
// derived from it is written to AiUsageLog as an *estimate* (see the
// comment on estimatedCostUsd in app/models/AiUsageLog.ts) rather than
// treated as authoritative. Update the $/1M figures here when a provider
// changes pricing. Unlisted models (e.g. the openai.ts scaffold's
// gpt-4o-mini once it's live, or a future model) simply produce no cost
// estimate rather than a wrong one.
const PRICING_USD_PER_1M_TOKENS: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 1, output: 5 },
  'claude-sonnet-5': { input: 3, output: 15 },
  'gemini-flash-lite-latest': { input: 0.1, output: 0.4 },
  'gemini-embedding-001': { input: 0.15, output: 0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
};

function estimateCostUsd(model?: string, inputTokens?: number, outputTokens?: number): number | undefined {
  if (!model || inputTokens === undefined || outputTokens === undefined) return undefined;
  const price = PRICING_USD_PER_1M_TOKENS[model];
  if (!price) return undefined;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

// Fire-and-forget by design — logging a call must never delay or break the
// AI response it's logging. Errors here are swallowed after a single
// console.error; a missed usage-log row is a rounding error, a blocked AI
// call over a logging hiccup would not be.
//
// provider is typed against AIProviderName (app/lib/ai/types.ts) rather
// than a local union so it stays in sync with the abstraction layer's
// provider list automatically — widened here to include 'openai' as part
// of the Phase 0 scaffold, even though nothing calls logAiUsage('openai',
// ...) outside of the still-unused providers/openai.ts.
export function logAiUsage(
  provider: AIProviderName,
  success: boolean,
  errorMessage?: string,
  metrics?: AiUsageMetrics
) {
  const { model, inputTokens, outputTokens, latencyMs } = metrics ?? {};
  const totalTokens =
    inputTokens !== undefined && outputTokens !== undefined ? inputTokens + outputTokens : undefined;

  connectDB()
    .then(() =>
      AiUsageLog.create({
        provider,
        success,
        errorMessage: errorMessage?.slice(0, 300) || '',
        aiModel: model,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCostUsd: estimateCostUsd(model, inputTokens, outputTokens),
        latencyMs,
      })
    )
    .catch((e) => console.error('[AiUsageLog] failed to record usage', e));
}
