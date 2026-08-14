import { describe, it, expect } from 'vitest';
import { computeQualification } from '@/app/lib/leadQualification/computeQualification';

const THRESHOLDS = [
  { id: 'cold', key: 'cold' as const, label: 'Cold', minScore: 0, maxScore: 24, order: 1, color: '', active: true },
  { id: 'warm', key: 'warm' as const, label: 'Warm', minScore: 25, maxScore: 49, order: 2, color: '', active: true },
  { id: 'hot', key: 'hot' as const, label: 'Hot', minScore: 50, maxScore: 74, order: 3, color: '', active: true },
  { id: 'very_hot', key: 'very_hot' as const, label: 'Very Hot', minScore: 75, maxScore: 100, order: 4, color: '', active: true },
];

function settingsWith(scoringRules: any[], thresholds = THRESHOLDS) {
  return { enabled: true, version: 'v1', thresholds, scoringRules, notifyOnHot: { enabled: false, minTemperature: 'hot' } } as any;
}

describe('computeQualification', () => {
  it('sums points from every matched, enabled, global rule', () => {
    const settings = settingsWith([
      { id: 'r1', event: 'service_selected', points: 10, enabled: true, branch: '', description: 'Service selected' },
      { id: 'r2', event: 'status_confirmed', points: 20, enabled: true, branch: '', description: 'Confirmed' },
    ]);
    const result = computeQualification({ service: 'Hair Transplant', status: 'confirmed' }, {}, settings);
    expect(result.score).toBe(30);
    expect(result.breakdown).toEqual([
      { ruleId: 'r1', label: 'Service selected', points: 10 },
      { ruleId: 'r2', label: 'Confirmed', points: 20 },
    ]);
  });

  it('excludes disabled rules', () => {
    const settings = settingsWith([
      { id: 'r1', event: 'service_selected', points: 10, enabled: false, branch: '', description: '' },
    ]);
    const result = computeQualification({ service: 'Hair' }, {}, settings);
    expect(result.score).toBe(0);
    expect(result.breakdown).toEqual([]);
  });

  it('applies a branch-scoped rule only to a matching location', () => {
    const settings = settingsWith([
      { id: 'r1', event: 'service_selected', points: 10, enabled: true, branch: 'chennai', description: '' },
    ]);
    const chennai = computeQualification({ service: 'Hair', location: 'chennai' }, {}, settings);
    const bangalore = computeQualification({ service: 'Hair', location: 'bangalore' }, {}, settings);
    expect(chennai.score).toBe(10);
    expect(bangalore.score).toBe(0);
  });

  it('applies a global rule (blank branch) regardless of location', () => {
    const settings = settingsWith([
      { id: 'r1', event: 'service_selected', points: 10, enabled: true, branch: '', description: '' },
    ]);
    const result = computeQualification({ service: 'Hair', location: 'bangalore' }, {}, settings);
    expect(result.score).toBe(10);
  });

  it('clamps the score to [0, 100]', () => {
    const highSettings = settingsWith([
      { id: 'r1', event: 'service_selected', points: 60, enabled: true, branch: '', description: '' },
      { id: 'r2', event: 'location_selected', points: 60, enabled: true, branch: '', description: '' },
    ]);
    const high = computeQualification({ service: 'Hair', location: 'chennai' }, {}, highSettings);
    expect(high.score).toBe(100);

    const lowSettings = settingsWith([
      { id: 'r1', event: 'return_visit', points: -50, enabled: true, branch: '', description: '' },
    ]);
    const low = computeQualification({ isReturnVisit: true }, {}, lowSettings);
    expect(low.score).toBe(0);
  });

  it('resolves the fixed temperature key from the matching threshold row', () => {
    const settings = settingsWith([
      { id: 'r1', event: 'status_completed', points: 60, enabled: true, branch: '', description: '' },
    ]);
    const result = computeQualification({ status: 'completed' }, {}, settings);
    expect(result.score).toBe(60);
    expect(result.temperature).toBe('hot');
  });

  it('returns "unclassified" when the score falls in a gap between thresholds, never the nearest guess', () => {
    const gappedThresholds = [
      { id: 'cold', key: 'cold' as const, label: 'Cold', minScore: 0, maxScore: 20, order: 1, color: '', active: true },
      { id: 'hot', key: 'hot' as const, label: 'Hot', minScore: 60, maxScore: 100, order: 2, color: '', active: true },
    ];
    const settings = settingsWith(
      [{ id: 'r1', event: 'service_selected', points: 40, enabled: true, branch: '', description: '' }],
      gappedThresholds
    );
    const result = computeQualification({ service: 'Hair' }, {}, settings);
    expect(result.score).toBe(40);
    expect(result.temperature).toBe('unclassified');
  });

  it('skips an inactive threshold row', () => {
    const thresholds = [
      { id: 'hot', key: 'hot' as const, label: 'Hot', minScore: 0, maxScore: 100, order: 1, color: '', active: false },
    ];
    const settings = settingsWith(
      [{ id: 'r1', event: 'service_selected', points: 10, enabled: true, branch: '', description: '' }],
      thresholds
    );
    const result = computeQualification({ service: 'Hair' }, {}, settings);
    expect(result.temperature).toBe('unclassified');
  });

  it('never throws and returns unclassified/0/empty on missing settings', () => {
    expect(() => computeQualification({}, {}, undefined)).not.toThrow();
    const result = computeQualification({}, {}, null);
    expect(result).toEqual({ score: 0, temperature: 'unclassified', breakdown: [], version: '' });
  });

  it('never throws on an unrecognized event key — it just never matches', () => {
    const settings = settingsWith([
      { id: 'r1', event: 'some_future_event_not_yet_supported', points: 50, enabled: true, branch: '', description: '' },
    ]);
    const result = computeQualification({ service: 'Hair' }, {}, settings);
    expect(result.score).toBe(0);
    expect(result.breakdown).toEqual([]);
  });

  it('matches assessment/high-risk and booking-success signals from the related-signals input', () => {
    const settings = settingsWith([
      { id: 'r1', event: 'assessment_completed', points: 15, enabled: true, branch: '', description: 'Assessment done' },
      { id: 'r2', event: 'high_assessment_risk', points: 15, enabled: true, branch: '', description: 'High risk' },
      { id: 'r3', event: 'booking_success_event', points: 10, enabled: true, branch: '', description: 'Engaged post-booking' },
    ]);
    const result = computeQualification(
      {},
      { assessmentCompleted: true, assessmentRiskLevel: 'High', hasBookingSuccessEvent: true },
      settings
    );
    expect(result.score).toBe(40);
  });

  it('stamps the version from settings verbatim', () => {
    const settings = settingsWith([]);
    settings.version = 'v7';
    const result = computeQualification({}, {}, settings);
    expect(result.version).toBe('v7');
  });
});
