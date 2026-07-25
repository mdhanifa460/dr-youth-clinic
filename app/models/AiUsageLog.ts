import mongoose, { Schema, Document } from 'mongoose';

// One row per call to an external AI provider (Anthropic/Gemini), written
// from the single shared request helper each provider funnels through
// (app/lib/ai/anthropic.ts, app/lib/ai/gemini.ts) — every AI feature on the
// platform gets counted here for free, with no per-feature wiring.
//
// This exists to close a real blind spot: AI usage was invisible until it
// failed outright (this exact codebase hit an Anthropic credit-exhaustion
// wall repeatedly with zero earlier warning). It is intentionally NOT a
// cost/billing dashboard — provider pricing changes too often to keep an
// accurate $-estimate here, and a stale cost number is worse than no cost
// number. Call counts and the failure rate are enough to notice "something
// is calling AI far more than expected" or "every call has failed since
// Tuesday" before the bill or an outage is the first signal.
export interface IAiUsageLog extends Document {
  provider: 'anthropic' | 'gemini';
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

const AiUsageLogSchema = new Schema<IAiUsageLog>(
  {
    provider: { type: String, enum: ['anthropic', 'gemini'], required: true },
    success: { type: Boolean, required: true },
    errorMessage: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AiUsageLogSchema.index({ createdAt: -1 });
AiUsageLogSchema.index({ provider: 1, success: 1, createdAt: -1 });

export const AiUsageLog = mongoose.models.AiUsageLog || mongoose.model<IAiUsageLog>('AiUsageLog', AiUsageLogSchema);
