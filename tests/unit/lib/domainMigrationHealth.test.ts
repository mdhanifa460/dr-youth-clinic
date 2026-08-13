import { describe, it, expect } from 'vitest';
import { computeMigrationHealth, type MigrationHealthThresholds } from '@/app/lib/domainMigrationHealth';

const THRESHOLDS: MigrationHealthThresholds = { healthy: 5, monitor: 15, organicFloor: 20 };

describe('computeMigrationHealth', () => {
  it('is healthy when every signal is well under threshold and nothing is broken', () => {
    const result = computeMigrationHealth({
      oldSharePct: 2, oldLeadSharePct: 1, oldOrganicSharePct: 3, brokenTopUrls: 0, thresholds: THRESHOLDS,
    });
    expect(result.status).toBe('healthy');
    expect(result.recommendation).toBe('safe_to_review');
  });

  it('is monitor when old traffic share is between healthy and monitor thresholds', () => {
    const result = computeMigrationHealth({
      oldSharePct: 10, oldLeadSharePct: 2, oldOrganicSharePct: 3, brokenTopUrls: 0, thresholds: THRESHOLDS,
    });
    expect(result.status).toBe('monitor');
    expect(result.recommendation).toBe('continue_redirect');
  });

  it('is significant when old traffic share exceeds the monitor threshold', () => {
    const result = computeMigrationHealth({
      oldSharePct: 25, oldLeadSharePct: 2, oldOrganicSharePct: 3, brokenTopUrls: 0, thresholds: THRESHOLDS,
    });
    expect(result.status).toBe('significant');
    expect(result.recommendation).toBe('significant_old_traffic');
  });

  it('is significant on a single broken high-traffic redirect alone, even with every other signal healthy', () => {
    // The whole point of rule-based-not-averaged: one real problem must
    // never be diluted away by otherwise-good numbers.
    const result = computeMigrationHealth({
      oldSharePct: 1, oldLeadSharePct: 1, oldOrganicSharePct: 1, brokenTopUrls: 1, thresholds: THRESHOLDS,
    });
    expect(result.status).toBe('significant');
    expect(result.reasons.some((r) => r.includes('redirect correctly'))).toBe(true);
  });

  it('is significant when old-domain organic impressions alone exceed the organic floor', () => {
    const result = computeMigrationHealth({
      oldSharePct: 1, oldLeadSharePct: 1, oldOrganicSharePct: 35, brokenTopUrls: 0, thresholds: THRESHOLDS,
    });
    expect(result.status).toBe('significant');
  });

  it('never treats a null (unavailable) signal as zero — excludes it from every rule', () => {
    // All signals unavailable and no broken redirect — this must NOT read
    // as "measured and healthy"; it's "nothing has been measured yet",
    // which is a materially different, distinct status (see below).
    const allNull = computeMigrationHealth({
      oldSharePct: null, oldLeadSharePct: null, oldOrganicSharePct: null, brokenTopUrls: 0, thresholds: THRESHOLDS,
    });
    expect(allNull.status).toBe('insufficient_data');

    const withBroken = computeMigrationHealth({
      oldSharePct: null, oldLeadSharePct: null, oldOrganicSharePct: null, brokenTopUrls: 2, thresholds: THRESHOLDS,
    });
    expect(withBroken.status).toBe('significant');
  });

  it('reports insufficient_data (not a false-positive healthy) when nothing has been measured yet', () => {
    const result = computeMigrationHealth({
      oldSharePct: null, oldLeadSharePct: null, oldOrganicSharePct: null, brokenTopUrls: 0, thresholds: THRESHOLDS,
    });
    expect(result.status).toBe('insufficient_data');
    expect(result.recommendation).toBe('connect_data_sources');
    expect(result.reasons.join(' ')).toMatch(/no data sources are connected/i);
  });

  it('takes the worst signal, not an average, when traffic is healthy but leads are not', () => {
    const result = computeMigrationHealth({
      oldSharePct: 1, oldLeadSharePct: 40, oldOrganicSharePct: 1, brokenTopUrls: 0, thresholds: THRESHOLDS,
    });
    expect(result.status).toBe('significant');
    expect(result.reasons.some((r) => r.includes('lead share'))).toBe(true);
  });

  it('reasons array explains every triggering signal, not just the first one found', () => {
    const result = computeMigrationHealth({
      oldSharePct: 30, oldLeadSharePct: 30, oldOrganicSharePct: 1, brokenTopUrls: 1, thresholds: THRESHOLDS,
    });
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
  });
});
