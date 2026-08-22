import { describe, it, expect } from 'vitest';
import { extractIdentity, identitiesMatch, normalizeIdempotencyKey } from '@/app/lib/bookingIdempotency';

describe('extractIdentity — the narrow set of fields that describe WHAT was booked', () => {
  it('extracts and trims the core identity fields', () => {
    expect(extractIdentity({
      name: ' John ', phone: '919999999999', service: ' Skin ', location: ' Chennai ',
      date: '2026-08-25', time: '10:00 AM',
      utmSource: 'google', utmCampaign: 'x', attributionId: 'abc', // deliberately ignored
    })).toEqual({
      name: 'John', phone: '919999999999', service: 'Skin', location: 'chennai',
      date: '2026-08-25', time: '10:00 AM',
    });
  });

  it('missing fields default to empty string, never undefined/crash', () => {
    expect(extractIdentity({})).toEqual({ name: '', phone: '', service: '', location: '', date: '', time: '' });
  });

  it('location is lowercased so "Chennai" and "chennai" are the same identity', () => {
    const a = extractIdentity({ location: 'Chennai' });
    const b = extractIdentity({ location: 'chennai' });
    expect(a.location).toBe(b.location);
  });
});

describe('identitiesMatch', () => {
  const base = { name: 'John', phone: '919999999999', service: 'Skin', location: 'chennai', date: '2026-08-25', time: '10:00 AM' };

  it('identical identities match', () => {
    expect(identitiesMatch(base, { ...base })).toBe(true);
  });

  it('a different service does not match (same key, materially different data → conflict)', () => {
    expect(identitiesMatch(base, { ...base, service: 'Hair' })).toBe(false);
  });

  it('a different date does not match', () => {
    expect(identitiesMatch(base, { ...base, date: '2026-08-26' })).toBe(false);
  });

  it('a different phone does not match', () => {
    expect(identitiesMatch(base, { ...base, phone: '918888888888' })).toBe(false);
  });
});

describe('normalizeIdempotencyKey — defensive against a user-controllable header', () => {
  it('accepts a well-formed UUID-shaped key', () => {
    expect(normalizeIdempotencyKey('a1b2c3d4-e5f6-47a8-9b0c-1d2e3f4a5b6c')).toBe('a1b2c3d4-e5f6-47a8-9b0c-1d2e3f4a5b6c');
  });

  it('accepts any opaque alphanumeric/dash/underscore string in range, not just UUIDs', () => {
    expect(normalizeIdempotencyKey('nanoid_style-Key123456')).toBe('nanoid_style-Key123456');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeIdempotencyKey('  abc12345  ')).toBe('abc12345');
  });

  it('rejects missing/empty — degrades to "no key", never throws', () => {
    expect(normalizeIdempotencyKey(null)).toBeNull();
    expect(normalizeIdempotencyKey(undefined)).toBeNull();
    expect(normalizeIdempotencyKey('')).toBeNull();
  });

  it('rejects a too-short value (likely malformed/truncated)', () => {
    expect(normalizeIdempotencyKey('short')).toBeNull();
  });

  it('rejects an absurdly long value', () => {
    expect(normalizeIdempotencyKey('x'.repeat(500))).toBeNull();
  });

  it('rejects characters outside the safe set (never used as-is in a query)', () => {
    expect(normalizeIdempotencyKey('abc$(rm -rf /)def123')).toBeNull();
    expect(normalizeIdempotencyKey('{"$ne": null}xxxxxxx')).toBeNull();
  });
});
