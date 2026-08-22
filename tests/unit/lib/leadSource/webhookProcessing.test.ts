import { describe, it, expect } from 'vitest';
import { buildDedupQuery, shouldNotifyBranch, deriveLeadSourceAttribution } from '@/app/lib/leadSource/webhookProcessing';

describe('buildDedupQuery — idempotency key, conversionChannel + sourceAccount + externalId together', () => {
  it('scopes by channel AND sourceAccount, not externalId alone — two accounts on the same provider must never collide', () => {
    const chennai = buildDedupQuery('justdial', 'JD-CHN-001', 'LEAD-1001');
    const bangalore = buildDedupQuery('justdial', 'JD-BLR-001', 'LEAD-1001');
    // Same provider, same externalId string, DIFFERENT accounts — the two
    // queries must differ, or Bangalore's lead #1001 would look up (and
    // silently overwrite) Chennai's lead #1001.
    expect(chennai).not.toEqual(bangalore);
    expect(chennai).toEqual({ externalCrmId: 'LEAD-1001', conversionChannel: 'justdial', sourceAccount: 'JD-CHN-001' });
  });

  it('the same channel + sourceAccount + externalId always produces the same query — a genuine retry updates in place', () => {
    const first = buildDedupQuery('justdial', 'JD-CHN-001', 'LEAD-1001');
    const retry = buildDedupQuery('justdial', 'JD-CHN-001', 'LEAD-1001');
    expect(first).toEqual(retry);
  });

  it('returns null (no dedup attempted) when there is no externalId — never a guessed match', () => {
    expect(buildDedupQuery('justdial', 'JD-CHN-001', '')).toBeNull();
  });

  it('queries by conversionChannel, NOT the acquisition source — a Google Lead Form retry (source written as "google") must still be found by its stable channel identity "google_lead_form", not the mutable source value', () => {
    // Regression test for a real bug caught during live verification: the
    // query used to key on `source`, but Booking.source for this provider
    // is written as "google" (the real acquisition source), not
    // "google_lead_form" — querying on `source` would never find the
    // record it just created, producing a duplicate on every retry.
    const query = buildDedupQuery('google_lead_form', 'CAMPAIGN-001', 'LEAD-9001');
    expect(query).toEqual({ externalCrmId: 'LEAD-9001', conversionChannel: 'google_lead_form', sourceAccount: 'CAMPAIGN-001' });
    expect(query).not.toHaveProperty('source');
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

describe('deriveLeadSourceAttribution — Marketing Attribution (Phase 2): source vs. conversionChannel', () => {
  it('JustDial → CRM: source and conversionChannel both stay "justdial"', () => {
    expect(deriveLeadSourceAttribution('justdial')).toEqual({
      attributionSource: 'justdial', conversionChannel: 'justdial', isGoogleLeadForm: false,
    });
  });

  it('IndiaMART → CRM: source and conversionChannel both stay "indiamart"', () => {
    expect(deriveLeadSourceAttribution('indiamart')).toEqual({
      attributionSource: 'indiamart', conversionChannel: 'indiamart', isGoogleLeadForm: false,
    });
  });

  it('Google Lead Form: source becomes the real acquisition source "google", conversionChannel stays "google_lead_form"', () => {
    expect(deriveLeadSourceAttribution('google_lead_form')).toEqual({
      attributionSource: 'google', conversionChannel: 'google_lead_form', isGoogleLeadForm: true,
    });
  });

  it('an unrecognized future provider falls back to conversionChannel "other" — never rejected', () => {
    expect(deriveLeadSourceAttribution('some_new_directory')).toEqual({
      attributionSource: 'some_new_directory', conversionChannel: 'other', isGoogleLeadForm: false,
    });
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
