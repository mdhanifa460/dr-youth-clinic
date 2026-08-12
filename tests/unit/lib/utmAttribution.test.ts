import { describe, it, expect } from 'vitest';
import {
  extractUtmParams,
  parseUtmCookie,
  formatTouchSource,
  buildAttributionFields,
  UTM_FIRST_COOKIE,
  UTM_LAST_COOKIE,
} from '@/app/lib/utmAttribution';

describe('extractUtmParams', () => {
  it('extracts all 5 standard UTM params', () => {
    const sp = new URLSearchParams('utm_source=google&utm_medium=cpc&utm_campaign=hydra_facial_chennai&utm_term=hydra+facial&utm_content=ad1');
    expect(extractUtmParams(sp)).toEqual({
      source: 'google', medium: 'cpc', campaign: 'hydra_facial_chennai', term: 'hydra facial', content: 'ad1',
    });
  });

  it('returns an empty object when no UTM params are present', () => {
    expect(extractUtmParams(new URLSearchParams('ref=other&page=2'))).toEqual({});
  });

  it('only includes params that are actually present', () => {
    const sp = new URLSearchParams('utm_source=instagram');
    expect(extractUtmParams(sp)).toEqual({ source: 'instagram' });
  });

  it('truncates absurdly long values rather than storing them unbounded', () => {
    const sp = new URLSearchParams('utm_source=' + 'x'.repeat(500));
    expect(extractUtmParams(sp).source?.length).toBe(200);
  });
});

describe('parseUtmCookie', () => {
  it('parses a well-formed JSON cookie', () => {
    expect(parseUtmCookie('{"source":"google","medium":"cpc"}')).toEqual({ source: 'google', medium: 'cpc' });
  });

  it('returns null for missing, empty, or garbled cookie values', () => {
    expect(parseUtmCookie(undefined)).toBeNull();
    expect(parseUtmCookie('')).toBeNull();
    expect(parseUtmCookie('not json')).toBeNull();
    expect(parseUtmCookie('"just a string"')).toBeNull();
  });
});

describe('formatTouchSource', () => {
  it('combines source and medium', () => {
    expect(formatTouchSource({ source: 'google', medium: 'cpc' })).toBe('google/cpc');
  });

  it('falls back to source alone when medium is missing', () => {
    expect(formatTouchSource({ source: 'direct' })).toBe('direct');
  });

  it('returns empty string for null/empty input', () => {
    expect(formatTouchSource(null)).toBe('');
    expect(formatTouchSource({})).toBe('');
  });
});

describe('buildAttributionFields', () => {
  it('reproduces the real production scenario: a visitor first arrives via Instagram, later converts via a Google ad', () => {
    const cookies: Record<string, string> = {
      [UTM_FIRST_COOKIE]: JSON.stringify({ source: 'instagram', medium: 'social', campaign: 'summer_launch', landingPage: '/skin-quiz' }),
      [UTM_LAST_COOKIE]: JSON.stringify({ source: 'google', medium: 'cpc', campaign: 'hydra_facial_chennai', term: 'hydra facial chennai', landingPage: '/lp/hydra-facial' }),
    };
    const result = buildAttributionFields((name) => cookies[name]);
    expect(result).toEqual({
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'hydra_facial_chennai',
      utmTerm: 'hydra facial chennai',
      utmContent: '',
      landingPage: '/lp/hydra-facial',
      firstTouchSource: 'instagram/social',
      lastTouchSource: 'google/cpc',
    });
  });

  it('returns all-empty fields when no attribution cookies exist (organic/direct visitor)', () => {
    const result = buildAttributionFields(() => undefined);
    expect(result).toEqual({
      utmSource: '', utmMedium: '', utmCampaign: '', utmTerm: '', utmContent: '',
      landingPage: '', firstTouchSource: '', lastTouchSource: '',
    });
  });

  it('never throws even if the cookie getter itself throws', () => {
    const result = buildAttributionFields(() => { throw new Error('boom'); });
    expect(result.utmSource).toBe('');
  });
});
