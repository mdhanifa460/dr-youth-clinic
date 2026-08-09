import { describe, it, expect } from 'vitest';
import { scoreJourneyConcern } from '@/app/lib/assessmentScoring';
import { DEFAULT_QUESTIONS, DEFAULT_TREATMENT_MAP } from '@/app/lib/quizDefaults';

describe('scoreJourneyConcern — Plan My Journey percentage redesign', () => {
  it('produces a category percentage and severity from real answers, auto-deriving max weight from the config itself', () => {
    const result = scoreJourneyConcern(DEFAULT_QUESTIONS, { concern: ['hair-fall'] }, DEFAULT_TREATMENT_MAP);

    const hair = result.categoryScores.find((c) => c.key === 'hair');
    expect(hair?.label).toBe('Hair Loss & Thinning');
    // Only the "concern" question carries the "hair" tag, weight 100 — the
    // only way to reach it is picking hair-fall/hair-thinning/baldness/
    // hair-transplant, so 100/100 = 100%, no admin-set maxWeight needed.
    expect(hair?.percent).toBe(100);
    expect(result.overallConcern).toBe(100);
    expect(['Mild', 'Moderate', 'Significant', 'High']).toContain(result.severity);
  });

  it('never includes a treatment name, price, or confidence score anywhere in the output', () => {
    const result = scoreJourneyConcern(DEFAULT_QUESTIONS, { concern: ['hair-fall'] }, DEFAULT_TREATMENT_MAP);
    const json = JSON.stringify(result).toLowerCase();
    expect(json).not.toContain('prp');
    expect(json).not.toContain('transplant treatment');
    expect(json).not.toContain('₹');
    expect(json).not.toMatch(/"confidence"/);
  });

  it('never surfaces contributing factors (Treatment Mapping removed — no concern-level source exists)', () => {
    // Business decision: doctors/patients work from concern%/severity/raw
    // answers only, not treatment-derived content — even when treatmentMap
    // entries still carry legacy possibleCauses data (kept for a possible
    // future Clinical Protocols module), scoreJourneyConcern must never
    // read it.
    const questions = [
      {
        id: 'q1', title: 'q', subtitle: '', description: '', icon: '', image: '',
        type: 'single' as const, order: 1, required: true,
        sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: '', conditionTags: [],
        answers: [
          { id: 'a1', title: 'a1', description: '', icon: '', image: '', score: 0, tags: ['hair'], weight: 50, nextQuestionId: '' },
        ],
      },
    ];
    const treatmentMap = [
      {
        concernTag: 'hair', concernLabel: 'Hair Loss & Thinning',
        treatments: [
          {
            id: 't1', name: 'Treatment One', icon: '', description: '', confidence: 90, priority: 1,
            sessions: '', duration: '', recovery: '', price: '', advantages: [], disadvantages: [], cta: '',
            requiredTags: [], clinicalIndicators: [], possibleCauses: ['Family history', 'Recent stress'],
            suggestedEvaluation: [], contraindications: [], doctorNotes: '', patientEducation: [], confidenceLevel: 'High' as const,
          },
        ],
      },
    ];

    const result = scoreJourneyConcern(questions, { q1: 'a1' }, treatmentMap);
    expect(result.contributingFactors).toEqual([]);
  });

  it('empty answers produce a 0% baseline with no categories', () => {
    const result = scoreJourneyConcern(DEFAULT_QUESTIONS, {}, DEFAULT_TREATMENT_MAP);
    expect(result.overallConcern).toBe(0);
    expect(result.categoryScores).toEqual([]);
    expect(result.riskLevel).toBe('');
  });
});
