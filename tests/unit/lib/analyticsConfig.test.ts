import { describe, it, expect } from 'vitest';
import { deriveGtmActive } from '@/app/lib/analyticsConfig';

// Regression coverage for the single invariant every duplicate-tracking
// guard in this codebase depends on (app/layout.tsx's GA4/Meta Pixel
// direct-load gates, app/lp/[slug]/page.tsx's per-LP tag gate, and the
// admin page's own status badges) — previously untested at the unit level
// despite being the most important correctness property in the whole
// analytics wiring.
describe('deriveGtmActive', () => {
  it('is true only when both enabled and a non-empty container ID are set', () => {
    expect(deriveGtmActive(true, 'GTM-NX462ZPQ')).toBe(true);
  });

  it('is false when GTM is disabled, even with a valid container ID saved', () => {
    expect(deriveGtmActive(false, 'GTM-NX462ZPQ')).toBe(false);
  });

  it('is false when enabled but no container ID is set', () => {
    expect(deriveGtmActive(true, '')).toBe(false);
  });

  it('is false when both are unset', () => {
    expect(deriveGtmActive(false, '')).toBe(false);
  });

  it('treats any non-empty string as a present ID — trimming/format validation is validateTrackingIds.ts\'s job, not this derivation\'s', () => {
    // A whitespace-only value is truthy in JS and would reach here as
    // "present" if it were ever saved — but app/api/admin/settings/route.ts
    // now trims before persisting (see validateTrackingIds.test.ts), so
    // this documents the existing `!!gtmId` contract rather than asserting
    // new behavior that belongs to a different, already-tested module.
    expect(deriveGtmActive(true, ' ')).toBe(true);
  });
});
