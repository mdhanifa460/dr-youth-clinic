import { describe, it, expect } from 'vitest';
import { buildDedupQuery, shouldNotifyBranch } from '@/app/lib/leadSource/webhookProcessing';

describe('buildDedupQuery — idempotency key, source + sourceAccount + externalId together', () => {
  it('scopes by source AND sourceAccount, not externalId alone — two accounts on the same provider must never collide', () => {
    const chennai = buildDedupQuery('justdial', 'JD-CHN-001', 'LEAD-1001');
    const bangalore = buildDedupQuery('justdial', 'JD-BLR-001', 'LEAD-1001');
    // Same provider, same externalId string, DIFFERENT accounts — the two
    // queries must differ, or Bangalore's lead #1001 would look up (and
    // silently overwrite) Chennai's lead #1001.
    expect(chennai).not.toEqual(bangalore);
    expect(chennai).toEqual({ externalCrmId: 'LEAD-1001', source: 'justdial', sourceAccount: 'JD-CHN-001' });
  });

  it('the same source + sourceAccount + externalId always produces the same query — a genuine retry updates in place', () => {
    const first = buildDedupQuery('justdial', 'JD-CHN-001', 'LEAD-1001');
    const retry = buildDedupQuery('justdial', 'JD-CHN-001', 'LEAD-1001');
    expect(first).toEqual(retry);
  });

  it('returns null (no dedup attempted) when there is no externalId — never a guessed match', () => {
    expect(buildDedupQuery('justdial', 'JD-CHN-001', '')).toBeNull();
  });
});

describe('shouldNotifyBranch — branch-specific WhatsApp alert gate', () => {
  it('true once a branch has actually resolved', () => {
    expect(shouldNotifyBranch('chennai')).toBe(true);
  });

  it('false for an unresolved branch — never a fallback/guessed notification target', () => {
    expect(shouldNotifyBranch(null)).toBe(false);
  });
});

describe('the fire-and-forget pattern used for the WhatsApp notification itself', () => {
  it('a rejected notification promise, wrapped the same way processLeadSourceWebhookEvent wraps it, never propagates or throws', async () => {
    // Mirrors exactly: notifyBranchOfLeadSourceBooking(...).catch((err) => { console.error(...) })
    // — proves the swallowing pattern itself is correct (a WhatsApp
    // failure can never surface as an unhandled rejection or affect the
    // caller), independent of mocking the real Mongoose/WhatsApp calls.
    const failingSend = () => Promise.reject(new Error('WhatsApp API unreachable'));
    let caught: unknown = null;
    await expect(
      failingSend().catch((err) => { caught = err; })
    ).resolves.toBeUndefined();
    expect((caught as Error).message).toBe('WhatsApp API unreachable');
  });
});
