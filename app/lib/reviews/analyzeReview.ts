import { generateText } from '@/app/lib/ai';
import { parseClaudeJson } from '@/app/lib/ai/anthropic';
import { REPORT_REASONS, type ReportReason } from '@/app/models/Review';

// ADMIN ASSISTANCE ONLY. This module never writes reported/reportStatus —
// only produces a suggestion an admin reads and decides on themselves (see
// the investigation report's own explicit rule: a low rating is never, by
// itself, a policy violation). Reuses the EXISTING AI abstraction
// (app/lib/ai/index.ts) — no new provider, no new credentials, same
// generateText() every other AI feature in this app already calls through.

export interface ReviewAnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative' | '';
  severity: 'low' | 'medium' | 'high' | '';
  possiblePolicyViolation: boolean;
  possibleReason: ReportReason | '';
  confidence: number | null;
  rawExplanation: string;
}

const FALLBACK: ReviewAnalysisResult = {
  sentiment: '', severity: '', possiblePolicyViolation: false, possibleReason: '', confidence: null, rawExplanation: '',
};

// Pure — builds the prompt without calling anything, so the exact wording
// (and the explicit "a low rating alone is NOT a violation" instruction)
// is directly unit-testable without mocking the AI call.
export function buildReviewAnalysisPrompt(rating: number | undefined, reviewText: string): string {
  return `You are assisting a clinic admin in reviewing a customer review. You are NOT deciding whether to remove or report it — only the admin makes that decision. Your job is only to surface a signal for them to consider.

Review rating: ${rating ?? 'unknown'}/5
Review text: "${(reviewText || '').slice(0, 2000)}"

IMPORTANT RULES:
- A low star rating is NEVER, by itself, evidence of a policy violation. Plenty of genuine 1-star reviews are simply real, negative feedback about the clinic's service, wait time, price, or outcome — that is normal, legitimate criticism, not a violation.
- Only set possiblePolicyViolation to true if the review TEXT ITSELF shows a real signal of one of these specific categories: spam, fake_engagement (e.g. reads like a bot, a competitor, or someone with no real interaction with the business), off_topic (not actually about this business), inappropriate_content, harassment_or_bullying, conflict_of_interest (e.g. a competitor or ex-employee), illegal_content. If it's just a normal negative opinion about the service, set it to false.
- If you are unsure, set possiblePolicyViolation to false and explain your uncertainty in rawExplanation — never guess toward "true".

Respond with ONLY this exact JSON shape, no other text:
{
  "sentiment": "positive" | "neutral" | "negative",
  "severity": "low" | "medium" | "high",
  "possiblePolicyViolation": boolean,
  "possibleReason": one of [${REPORT_REASONS.map((r) => `"${r}"`).join(', ')}] or "" if possiblePolicyViolation is false,
  "confidence": a number from 0 to 1,
  "rawExplanation": a short one-sentence explanation of your reasoning
}`;
}

// Pure — validates/coerces the AI's raw parsed JSON into the exact
// contract this app trusts, defaulting anything malformed/out-of-range to
// the safe "no signal" state rather than propagating a bad value.
export function coerceReviewAnalysis(raw: unknown): ReviewAnalysisResult {
  if (!raw || typeof raw !== 'object') return FALLBACK;
  const r = raw as Record<string, unknown>;
  const sentiment = ['positive', 'neutral', 'negative'].includes(r.sentiment as string) ? (r.sentiment as ReviewAnalysisResult['sentiment']) : '';
  const severity = ['low', 'medium', 'high'].includes(r.severity as string) ? (r.severity as ReviewAnalysisResult['severity']) : '';
  const possiblePolicyViolation = r.possiblePolicyViolation === true;
  const possibleReason = possiblePolicyViolation && (REPORT_REASONS as readonly string[]).includes(r.possibleReason as string)
    ? (r.possibleReason as ReportReason)
    : '';
  const confidenceNum = typeof r.confidence === 'number' ? r.confidence : Number(r.confidence);
  const confidence = Number.isFinite(confidenceNum) ? Math.max(0, Math.min(1, confidenceNum)) : null;
  const rawExplanation = typeof r.rawExplanation === 'string' ? r.rawExplanation.slice(0, 500) : '';
  return { sentiment, severity, possiblePolicyViolation, possibleReason, confidence, rawExplanation };
}

// The one impure call — never throws; a failed/unreachable AI provider
// degrades to the same "no signal yet" state a review naturally starts in,
// exactly like every other AI-assist feature in this app (never blocks the
// underlying action, here: viewing/managing the review).
export async function analyzeReview(rating: number | undefined, reviewText: string): Promise<ReviewAnalysisResult> {
  try {
    const prompt = buildReviewAnalysisPrompt(rating, reviewText);
    const text = await generateText(prompt, { maxTokens: 300 });
    return coerceReviewAnalysis(parseClaudeJson<unknown>(text));
  } catch {
    return FALLBACK;
  }
}
