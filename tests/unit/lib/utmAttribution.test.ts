import { describe, it, expect } from 'vitest';
import {
  extractUtmParams,
  extractClickIds,
  inferSourceMediumFromClickId,
  classifyFreshEntrance,
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
      // From utm_first, not utm_last — the visitor's real entry point
      // (the Instagram visit), distinct from `landingPage` above (the
      // later Google-ad visit that actually converted).
      originalLandingPage: '/skin-quiz',
      firstTouchSource: 'instagram/social',
      lastTouchSource: 'google/cpc',
      clickId: '', clickIdType: '',
    });
  });

  it('returns all-empty fields when no attribution cookies exist (organic/direct visitor)', () => {
    const result = buildAttributionFields(() => undefined);
    expect(result).toEqual({
      utmSource: '', utmMedium: '', utmCampaign: '', utmTerm: '', utmContent: '',
      landingPage: '', originalLandingPage: '', firstTouchSource: '', lastTouchSource: '',
      clickId: '', clickIdType: '',
    });
  });

  it('carries the click ID through from the last-touch cookie (Google Ads + GCLID → Website)', () => {
    const cookies: Record<string, string> = {
      [UTM_LAST_COOKIE]: JSON.stringify({ source: 'google', medium: 'cpc', clickId: 'Cj0KCQjw', clickIdType: 'gclid', landingPage: '/lp/hair-loss' }),
    };
    const result = buildAttributionFields((name) => cookies[name]);
    expect(result.clickId).toBe('Cj0KCQjw');
    expect(result.clickIdType).toBe('gclid');
    expect(result.utmSource).toBe('google');
    expect(result.utmMedium).toBe('cpc');
  });

  it('never throws even if the cookie getter itself throws', () => {
    const result = buildAttributionFields(() => { throw new Error('boom'); });
    expect(result.utmSource).toBe('');
  });
});

describe('extractClickIds — generic advertising click identifier capture', () => {
  it('captures a gclid', () => {
    expect(extractClickIds(new URLSearchParams('gclid=Cj0KCQjw'))).toEqual({ clickId: 'Cj0KCQjw', clickIdType: 'gclid' });
  });
  it('captures a gbraid', () => {
    expect(extractClickIds(new URLSearchParams('gbraid=abc123'))).toEqual({ clickId: 'abc123', clickIdType: 'gbraid' });
  });
  it('captures a wbraid', () => {
    expect(extractClickIds(new URLSearchParams('wbraid=xyz789'))).toEqual({ clickId: 'xyz789', clickIdType: 'wbraid' });
  });
  it('captures an fbclid', () => {
    expect(extractClickIds(new URLSearchParams('fbclid=IwAR123'))).toEqual({ clickId: 'IwAR123', clickIdType: 'fbclid' });
  });
  it('returns an empty object when no click ID is present', () => {
    expect(extractClickIds(new URLSearchParams('utm_source=google'))).toEqual({});
  });
  it('never invents a per-provider column — always the same {clickId, clickIdType} shape regardless of which param matched', () => {
    const gclid = extractClickIds(new URLSearchParams('gclid=A'));
    const fbclid = extractClickIds(new URLSearchParams('fbclid=B'));
    expect(Object.keys(gclid).sort()).toEqual(Object.keys(fbclid).sort());
  });
});

describe('inferSourceMediumFromClickId — Google Ads/Meta auto-tag without utm_*', () => {
  it('gclid/gbraid/wbraid infer google/cpc', () => {
    expect(inferSourceMediumFromClickId('gclid')).toEqual({ source: 'google', medium: 'cpc' });
    expect(inferSourceMediumFromClickId('gbraid')).toEqual({ source: 'google', medium: 'cpc' });
    expect(inferSourceMediumFromClickId('wbraid')).toEqual({ source: 'google', medium: 'cpc' });
  });
  it('fbclid infers facebook/cpc', () => {
    expect(inferSourceMediumFromClickId('fbclid')).toEqual({ source: 'facebook', medium: 'cpc' });
  });
  it('returns nothing when there is no click ID type to infer from', () => {
    expect(inferSourceMediumFromClickId(undefined)).toEqual({});
  });
});

describe('classifyFreshEntrance — organic search / direct, filling the gap UTM cookies never covered', () => {
  it('no referrer at all → direct/none', () => {
    expect(classifyFreshEntrance(null, 'dryouthclinic.com')).toEqual({ source: 'direct', medium: 'none' });
    expect(classifyFreshEntrance('', 'dryouthclinic.com')).toEqual({ source: 'direct', medium: 'none' });
  });

  it('a Google search-result referrer → google/organic (Organic Google → Website)', () => {
    expect(classifyFreshEntrance('https://www.google.com/search?q=hair+loss+clinic', 'dryouthclinic.com'))
      .toEqual({ source: 'google', medium: 'organic' });
  });

  it('a Bing referrer → bing/organic', () => {
    expect(classifyFreshEntrance('https://www.bing.com/search?q=hair+clinic', 'dryouthclinic.com'))
      .toEqual({ source: 'bing', medium: 'organic' });
  });

  it('an Instagram referrer → instagram/social (Meta → Website, no fbclid)', () => {
    expect(classifyFreshEntrance('https://l.instagram.com/', 'dryouthclinic.com'))
      .toEqual({ source: 'instagram', medium: 'social' });
  });

  it('an unrecognized external referrer → its own hostname as source, medium=referral', () => {
    expect(classifyFreshEntrance('https://some-blog.example.com/post', 'dryouthclinic.com'))
      .toEqual({ source: 'some-blog.example.com', medium: 'referral' });
  });

  it('a same-site referrer is NOT a fresh entrance — returns null, leaving last-touch untouched', () => {
    expect(classifyFreshEntrance('https://dryouthclinic.com/services/hair', 'dryouthclinic.com')).toBeNull();
    expect(classifyFreshEntrance('https://www.dryouthclinic.com/about', 'dryouthclinic.com')).toBeNull(); // www. variant
  });

  it('an unparseable referrer never throws or guesses — returns null', () => {
    expect(classifyFreshEntrance('not a url', 'dryouthclinic.com')).toBeNull();
  });
});
