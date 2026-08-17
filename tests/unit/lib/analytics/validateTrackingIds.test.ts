import { describe, it, expect } from 'vitest';
import {
  validateGtmId,
  validateGa4Id,
  validateMetaPixelId,
  validateClarityId,
  validateHotjarId,
  validateTrackingIds,
} from '@/app/lib/analytics/validateTrackingIds';

describe('validateGtmId', () => {
  it('accepts a real, known-good container ID', () => {
    expect(validateGtmId('GTM-NX462ZPQ')).toEqual({ valid: true, trimmed: 'GTM-NX462ZPQ' });
  });
  it('trims surrounding whitespace before validating', () => {
    expect(validateGtmId('  GTM-NX462ZPQ  ')).toEqual({ valid: true, trimmed: 'GTM-NX462ZPQ' });
  });
  it('treats an empty/whitespace-only value as valid (means "not configured")', () => {
    expect(validateGtmId('').valid).toBe(true);
    expect(validateGtmId('   ').valid).toBe(true);
  });
  it('rejects a value missing the GTM- prefix', () => {
    const r = validateGtmId('NX462ZPQ');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/GTM Container ID/);
  });
  it('rejects a lowercase or malformed container ID', () => {
    expect(validateGtmId('gtm-nx462zpq').valid).toBe(false);
    expect(validateGtmId('GTM-').valid).toBe(false);
    expect(validateGtmId('not-a-gtm-id').valid).toBe(false);
  });
});

describe('validateGa4Id', () => {
  it('accepts a real, known-good measurement ID', () => {
    expect(validateGa4Id('G-0K4NNXXBND')).toEqual({ valid: true, trimmed: 'G-0K4NNXXBND' });
  });
  it('trims whitespace', () => {
    expect(validateGa4Id(' G-0K4NNXXBND ').trimmed).toBe('G-0K4NNXXBND');
  });
  it('treats empty as valid', () => {
    expect(validateGa4Id('').valid).toBe(true);
  });
  it('rejects a GTM ID accidentally pasted into the GA4 field', () => {
    expect(validateGa4Id('GTM-NX462ZPQ').valid).toBe(false);
  });
  it('rejects a value missing the G- prefix', () => {
    expect(validateGa4Id('0K4NNXXBND').valid).toBe(false);
  });
});

describe('validateMetaPixelId', () => {
  it('accepts a plausible numeric pixel ID', () => {
    expect(validateMetaPixelId('123456789012345').valid).toBe(true);
  });
  it('rejects non-numeric input', () => {
    expect(validateMetaPixelId('abc123').valid).toBe(false);
  });
  it('treats empty as valid', () => {
    expect(validateMetaPixelId('').valid).toBe(true);
  });
});

describe('validateClarityId', () => {
  it('accepts a plausible alphanumeric project ID', () => {
    expect(validateClarityId('abcd1234ef').valid).toBe(true);
  });
  it('rejects an ID with special characters', () => {
    expect(validateClarityId('abcd-1234!').valid).toBe(false);
  });
  it('treats empty as valid', () => {
    expect(validateClarityId('').valid).toBe(true);
  });
});

describe('validateHotjarId', () => {
  it('accepts a plausible numeric site ID', () => {
    expect(validateHotjarId('1234567').valid).toBe(true);
  });
  it('rejects non-numeric input', () => {
    expect(validateHotjarId('abcdefg').valid).toBe(false);
  });
  it('treats empty as valid', () => {
    expect(validateHotjarId('').valid).toBe(true);
  });
});

describe('validateTrackingIds', () => {
  it('trims and validates every provided field, collecting errors per field', () => {
    const { trimmed, errors } = validateTrackingIds({
      gtmId: ' GTM-NX462ZPQ ',
      ga4Id: 'not-valid',
      metaPixelId: '123456789012345',
    });
    expect(trimmed.gtmId).toBe('GTM-NX462ZPQ');
    expect(trimmed.ga4Id).toBe('not-valid');
    expect(trimmed.metaPixelId).toBe('123456789012345');
    expect(errors.gtmId).toBeUndefined();
    expect(errors.ga4Id).toBeTruthy();
    expect(errors.metaPixelId).toBeUndefined();
  });

  it('only validates fields actually present in the input', () => {
    const { trimmed, errors } = validateTrackingIds({ gtmId: 'GTM-NX462ZPQ' });
    expect(Object.keys(trimmed)).toEqual(['gtmId']);
    expect(Object.keys(errors)).toEqual([]);
  });

  it('returns no errors when every present field is empty', () => {
    const { errors } = validateTrackingIds({ gtmId: '', ga4Id: '', metaPixelId: '', clarityId: '', hotjarId: '' });
    expect(Object.keys(errors)).toEqual([]);
  });
});
