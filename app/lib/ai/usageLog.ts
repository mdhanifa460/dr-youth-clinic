import { connectDB } from '@/app/lib/mongodb';
import { AiUsageLog } from '@/app/models/AiUsageLog';

// Fire-and-forget by design — logging a call must never delay or break the
// AI response it's logging. Errors here are swallowed after a single
// console.error; a missed usage-log row is a rounding error, a blocked AI
// call over a logging hiccup would not be.
export function logAiUsage(provider: 'anthropic' | 'gemini', success: boolean, errorMessage?: string) {
  connectDB()
    .then(() => AiUsageLog.create({ provider, success, errorMessage: errorMessage?.slice(0, 300) || '' }))
    .catch((e) => console.error('[AiUsageLog] failed to record usage', e));
}
