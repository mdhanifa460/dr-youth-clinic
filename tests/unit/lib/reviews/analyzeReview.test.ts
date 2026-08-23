import { describe, it, expect } from 'vitest';
import { buildReviewAnalysisPrompt, coerceReviewAnalysis } from '@/app/lib/reviews/analyzeReview';

describe('buildReviewAnalysisPrompt', () => {
  it('explicitly instructs that a low rating alone is never a violation', () => {
    const prompt = buildReviewAnalysisPrompt(1, 'Terrible experience, would not recommend.');
    expect(prompt).toMatch(/never.*by itself.*evidence of a policy violation|NEVER.*by itself/i);
  });

  it('includes the rating and review text verbatim', () => {
    const prompt = buildReviewAnalysisPrompt(2, 'The wait time was too long.');
    expect(prompt).toContain('2/5');
    expect(prompt).toContain('The wait time was too long.');
  });

  it('handles a missing rating without crashing', () => {
    const prompt = buildReviewAnalysisPrompt(undefined, 'Some text');
    expect(prompt).toContain('unknown/5');
  });

  it('truncates an extremely long review to a bounded prompt size', () => {
    const longText = 'x'.repeat(5000);
    const prompt = buildReviewAnalysisPrompt(3, longText);
    expect(prompt.length).toBeLessThan(6000);
  });
});

describe('coerceReviewAnalysis — never trusts the AI blindly', () => {
  it('accepts a well-formed response', () => {
    const result = coerceReviewAnalysis({
      sentiment: 'negative', severity: 'high', possiblePolicyViolation: true,
      possibleReason: 'spam', confidence: 0.91, rawExplanation: 'Reads like a bot-generated review.',
    });
    expect(result).toEqual({
      sentiment: 'negative', severity: 'high', possiblePolicyViolation: true,
      possibleReason: 'spam', confidence: 0.91, rawExplanation: 'Reads like a bot-generated review.',
    });
  });

  it('drops an invalid sentiment/severity value rather than trusting it', () => {
    const result = coerceReviewAnalysis({ sentiment: 'furious', severity: 'extreme', possiblePolicyViolation: false });
    expect(result.sentiment).toBe('');
    expect(result.severity).toBe('');
  });

  it('never sets possibleReason unless possiblePolicyViolation is actually true — a model contradicting itself is corrected, not trusted', () => {
    const result = coerceReviewAnalysis({ possiblePolicyViolation: false, possibleReason: 'spam' });
    expect(result.possibleReason).toBe('');
  });

  it('rejects a possibleReason outside the known vocabulary', () => {
    const result = coerceReviewAnalysis({ possiblePolicyViolation: true, possibleReason: 'i-dont-like-it' });
    expect(result.possibleReason).toBe('');
  });

  it('clamps confidence to the 0-1 range', () => {
    expect(coerceReviewAnalysis({ confidence: 1.5 }).confidence).toBe(1);
    expect(coerceReviewAnalysis({ confidence: -0.3 }).confidence).toBe(0);
  });

  it('a completely malformed/empty response degrades to the safe "no signal" state, never throws', () => {
    expect(coerceReviewAnalysis(null)).toEqual({
      sentiment: '', severity: '', possiblePolicyViolation: false, possibleReason: '', confidence: null, rawExplanation: '',
    });
    expect(coerceReviewAnalysis(undefined)).toEqual({
      sentiment: '', severity: '', possiblePolicyViolation: false, possibleReason: '', confidence: null, rawExplanation: '',
    });
    expect(coerceReviewAnalysis('not an object')).toEqual({
      sentiment: '', severity: '', possiblePolicyViolation: false, possibleReason: '', confidence: null, rawExplanation: '',
    });
  });

  it('a genuinely low-rating-only review should be classified as no violation (documents the intended AI behavior, not enforced in code)', () => {
    // This isn't testable purely at the coercion layer (that's the AI's own
    // judgment) — but a well-formed "no violation" response for a 1-star,
    // ordinary-negative-feedback review must round-trip cleanly.
    const result = coerceReviewAnalysis({
      sentiment: 'negative', severity: 'medium', possiblePolicyViolation: false,
      possibleReason: '', confidence: 0.85, rawExplanation: 'Genuine negative feedback about wait times, not a policy violation.',
    });
    expect(result.possiblePolicyViolation).toBe(false);
    expect(result.possibleReason).toBe('');
  });

  it('truncates an excessively long rawExplanation', () => {
    const result = coerceReviewAnalysis({ rawExplanation: 'x'.repeat(1000) });
    expect(result.rawExplanation.length).toBe(500);
  });
});
