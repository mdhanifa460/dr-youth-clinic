import { describe, it, expect } from 'vitest';
import { scoreAssessment } from '@/app/lib/assessmentTypeScoring';
import { DEFAULT_ASSESSMENT_TYPES } from '@/app/lib/assessmentTypeDefaults';

const hair = DEFAULT_ASSESSMENT_TYPES.find((t) => t.key === 'hair')!;

describe('scoreAssessment — hair', () => {
  it('produces category percentages, overall concern, and severity from real answers', () => {
    const result = scoreAssessment(hair, {
      'primary-concern': 'hair-fall',
      duration: 'd-over-1y',
      progression: 'rapid',
      'family-history': 'fh-yes',
      lifestyle: ['ls-stress'],
    });

    const hairFall = result.categoryScores.find((c) => c.key === 'hair-fall-impact');
    // 40 (concern) + 40 (duration) + 40 (rapid progression) = 120 / maxWeight 120 = 100%
    expect(hairFall?.percent).toBe(100);

    expect(result.overallConcern).toBeGreaterThan(0);
    expect(['Mild', 'Moderate', 'Significant', 'High']).toContain(result.severity);
  });

  it('never includes a treatment name anywhere in the output', () => {
    const result = scoreAssessment(hair, { 'primary-concern': 'hair-fall', duration: 'd-over-1y' });
    const json = JSON.stringify(result).toLowerCase();
    expect(json).not.toContain('prp');
    expect(json).not.toContain('transplant');
    expect(json).not.toContain('₹');
  });

  it('computes Risk Level independently from Concern Level', () => {
    // Family history alone contributes 0 concern weight but real risk weight.
    const result = scoreAssessment(hair, { 'family-history': 'fh-yes' });
    expect(result.overallConcern).toBe(0);
    expect(result.riskScore).toBeGreaterThan(0);
    expect(['Low', 'Moderate', 'Elevated', 'High']).toContain(result.riskLevel);
  });

  it('surfaces contributing factors only for tags actually collected', () => {
    const result = scoreAssessment(hair, { 'family-history': 'fh-yes', lifestyle: ['ls-stress'] });
    const labels = result.contributingFactors.map((f) => f.label);
    expect(labels).toContain('Family history');
    expect(labels).toContain('Recent stress');
    expect(labels).not.toContain('Rapid progression');
  });

  it('detects the rapid-progression contributing factor when that path is taken', () => {
    const result = scoreAssessment(hair, { progression: 'rapid' });
    const labels = result.contributingFactors.map((f) => f.label);
    expect(labels).toContain('Rapid progression');
  });

  it('returns 0/lowest-band severity for no answers at all', () => {
    const result = scoreAssessment(hair, {});
    expect(result.overallConcern).toBe(0);
    expect(result.severity).toBe('Mild');
    expect(result.riskScore).toBe(0);
    expect(result.contributingFactors).toEqual([]);
  });

  it('clamps a category to 100% even if configured weights could theoretically exceed maxWeight', () => {
    const result = scoreAssessment(hair, {
      'primary-concern': 'hair-fall', duration: 'd-over-1y', progression: 'rapid',
    });
    for (const cat of result.categoryScores) {
      expect(cat.percent).toBeLessThanOrEqual(100);
      expect(cat.percent).toBeGreaterThanOrEqual(0);
    }
  });
});
