import mongoose, { Schema, Document } from 'mongoose';

// One row per call to an external AI provider (Anthropic/Gemini), written
// from the single shared request helper each provider funnels through
// (app/lib/ai/anthropic.ts, app/lib/ai/gemini.ts) — every AI feature on the
// platform gets counted here for free, with no per-feature wiring.
//
// This exists to close a real blind spot: AI usage was invisible until it
// failed outright (this exact codebase hit an Anthropic credit-exhaustion
// wall repeatedly with zero earlier warning). Call counts and the failure
// rate are enough to notice "something is calling AI far more than
// expected" or "every call has failed since Tuesday" before the bill or an
// outage is the first signal.
//
// estimatedCostUsd is a deliberate exception to "no stale cost number is
// better than a wrong one": it's computed at write time from a manually
// maintained per-model price table (see PRICING_USD_PER_1M_TOKENS in
// app/lib/ai/usageLog.ts), not fetched from any billing API — so it's
// always labeled and treated as an estimate, not the source of truth for
// what was actually billed. Token counts themselves (inputTokens/
// outputTokens/totalTokens) are read directly off each provider's response
// and are exact, not estimated.
export interface IAiUsageLog extends Document {
  provider: 'anthropic' | 'gemini' | 'openai';
  success: boolean;
  errorMessage?: string;
  // Named aiModel, not model — Document already has a reserved `model`
  // property (the Mongoose instance method for accessing other models),
  // and reusing that name breaks IAiUsageLog's Document typing.
  aiModel?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  latencyMs?: number;
  createdAt: Date;
}

const AiUsageLogSchema = new Schema<IAiUsageLog>(
  {
    provider: { type: String, enum: ['anthropic', 'gemini', 'openai'], required: true },
    success: { type: Boolean, required: true },
    errorMessage: { type: String, default: '' },
    aiModel: { type: String },
    inputTokens: { type: Number },
    outputTokens: { type: Number },
    totalTokens: { type: Number },
    estimatedCostUsd: { type: Number },
    latencyMs: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AiUsageLogSchema.index({ createdAt: -1 });
AiUsageLogSchema.index({ provider: 1, success: 1, createdAt: -1 });

export const AiUsageLog = mongoose.models.AiUsageLog || mongoose.model<IAiUsageLog>('AiUsageLog', AiUsageLogSchema);
