import { describe, it, expect } from 'vitest';
import { buildBookingCompletedParams } from '@/app/lib/trackConversion';

// buildBookingCompletedParams is the pure param-builder behind the
// booking_completed GA4/GTM event (see trackBookingConversion) — covering
// it directly, without mocking window/dataLayer, is enough to guarantee
// the one invariant that matters here: no empty/undefined param ever
// reaches GTM, and branch/location always mirror each other.
describe('buildBookingCompletedParams', () => {
  it('always includes booking_id', () => {
    const params = buildBookingCompletedParams({ bookingId: 'DR-123' });
    expect(params.booking_id).toBe('DR-123');
  });

  it('mirrors location into both branch and location', () => {
    const params = buildBookingCompletedParams({ bookingId: 'DR-123', location: 'chennai' });
    expect(params.branch).toBe('chennai');
    expect(params.location).toBe('chennai');
  });

  // The app's own booking entry points don't agree on casing (main /book
  // form sends "Chennai", the AI chat widget forces lowercase, others pass
  // through a dropdown/server value as-is) — without normalization, a GTM
  // trigger written for one exact case would silently miss bookings from
  // whichever entry points use a different one. This is the actual bug
  // this normalization fixes.
  it('normalizes location casing/whitespace so every entry point produces the same branch value', () => {
    const params = buildBookingCompletedParams({ bookingId: 'DR-123', location: '  Chennai ' });
    expect(params.branch).toBe('chennai');
    expect(params.location).toBe('chennai');
  });

  it('includes source, source_account, campaign, and medium when present', () => {
    const params = buildBookingCompletedParams({
      bookingId: 'DR-123',
      source: 'google',
      medium: 'cpc',
      campaign: 'summer-offer',
      sourceAccount: 'justdial-12345',
    });
    expect(params.source).toBe('google');
    expect(params.medium).toBe('cpc');
    expect(params.campaign).toBe('summer-offer');
    expect(params.source_account).toBe('justdial-12345');
  });

  it('omits branch/location/source/medium/campaign/source_account when not provided', () => {
    const params = buildBookingCompletedParams({ bookingId: 'DR-123' });
    expect(params).not.toHaveProperty('branch');
    expect(params).not.toHaveProperty('location');
    expect(params).not.toHaveProperty('source');
    expect(params).not.toHaveProperty('medium');
    expect(params).not.toHaveProperty('campaign');
    expect(params).not.toHaveProperty('source_account');
  });

  it('omits empty-string fields rather than sending a blank param', () => {
    const params = buildBookingCompletedParams({
      bookingId: 'DR-123',
      source: '',
      medium: '',
      campaign: '',
      sourceAccount: '',
      location: '',
    });
    expect(Object.keys(params)).toEqual(['booking_id']);
  });
});
