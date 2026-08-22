// Shared by middleware.ts (Edge runtime, writes the cookies) and every
// Lead/Booking creation route (Node runtime, reads them back) — kept
// dependency-free (no next/headers, no Node-only APIs) so it works
// identically in both.

export interface UtmTouch {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  landingPage?: string;
  capturedAt?: string;
  // Generic advertising click identifier — deliberately ONE pair of
  // fields (clickId + clickIdType), never a per-provider column
  // (gclid/fbclid/... as separate keys), so a future ad platform's click
  // ID is a new clickIdType value, not a schema change. See
  // extractClickIds() below for what populates these.
  clickId?: string;
  clickIdType?: string;
}

export const UTM_FIRST_COOKIE = 'utm_first';
export const UTM_LAST_COOKIE = 'utm_last';

// 90 days for first-touch (a long enough window that an ad click today can
// still be credited on a booking made weeks later), 30 days for last-touch
// (matches the lookback window GA4/Google Ads use by default for "last
// click" attribution) — both are cookie `maxAge` values in seconds.
export const UTM_FIRST_MAX_AGE = 60 * 60 * 24 * 90;
export const UTM_LAST_MAX_AGE = 60 * 60 * 24 * 30;

const UTM_PARAM_MAP: Record<string, keyof UtmTouch> = {
  utm_source: 'source',
  utm_medium: 'medium',
  utm_campaign: 'campaign',
  utm_term: 'term',
  utm_content: 'content',
};

// Reads standard UTM query params off a URL's search params. Returns an
// empty object (not null) when none are present, so callers can cheaply
// check `Object.keys(result).length > 0` before writing any cookie.
export function extractUtmParams(searchParams: URLSearchParams): Partial<UtmTouch> {
  const out: Partial<UtmTouch> = {};
  for (const [param, field] of Object.entries(UTM_PARAM_MAP)) {
    const v = searchParams.get(param);
    // Guard against absurdly long values ending up in cookies/DB — no real
    // campaign param needs more than this.
    if (v) out[field] = v.slice(0, 200);
  }
  return out;
}

// Advertising click identifiers — captured generically as {clickId,
// clickIdType} rather than one schema column per provider. Only ONE is
// ever kept per visit (first match wins in the order below); a URL
// carrying two click IDs at once essentially never happens in practice
// (a single ad click only ever appends its own platform's parameter).
const CLICK_ID_PARAMS: Array<{ param: string; type: string }> = [
  { param: 'gclid', type: 'gclid' },
  { param: 'gbraid', type: 'gbraid' },
  { param: 'wbraid', type: 'wbraid' },
  { param: 'fbclid', type: 'fbclid' },
];

export function extractClickIds(searchParams: URLSearchParams): Pick<UtmTouch, 'clickId' | 'clickIdType'> {
  for (const { param, type } of CLICK_ID_PARAMS) {
    const v = searchParams.get(param);
    if (v) return { clickId: v.slice(0, 200), clickIdType: type };
  }
  return {};
}

// Google Ads and Meta both auto-append a click ID even when a campaign
// carries no utm_* parameters at all (UTMs are opt-in on top of
// auto-tagging — a very common real-world setup). Without this, a visit
// that arrives with only ?gclid=... would be captured with an EMPTY
// source/medium, even though the click ID itself already tells us it was
// a paid Google/Meta click. This infers source/medium ONLY when
// utm_source was not explicitly provided — an explicit utm_source always
// wins, this never overrides real campaign tagging.
export function inferSourceMediumFromClickId(clickIdType?: string): Partial<UtmTouch> {
  if (!clickIdType) return {};
  if (clickIdType === 'fbclid') return { source: 'facebook', medium: 'cpc' };
  return { source: 'google', medium: 'cpc' }; // gclid / gbraid / wbraid
}

// Cookie values are JSON — parsed defensively since a cookie is
// user-controllable input, not a trusted internal format.
export function parseUtmCookie(raw?: string | null): UtmTouch | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

// ── Fresh-entrance classification (organic search / direct) ───────────────
//
// The UTM cookies above only ever get written on a visit that explicitly
// carries utm_*/click-id params — by original design, "most page loads are
// a no-op here" (see captureUtmAttribution's own comment in middleware.ts).
// That leaves a real gap: a visitor who arrives via an organic Google
// result, or by typing the URL directly, was never recorded as a touch at
// all — and a visitor who first arrived via a paid campaign weeks ago, then
// returns today with no campaign params, would keep showing that STALE
// campaign as their "last touch" forever, since nothing ever overwrites it.
//
// classifyFreshEntrance() closes that gap using the one additional signal
// available at a fresh, real entrance to the site: the HTTP Referer header.
// It is intentionally conservative — same-origin referrers (a visitor
// clicking a link to another page ON this site) return null, meaning "not a
// new entrance, leave last-touch exactly as it is," so ordinary in-site
// browsing can never overwrite a real campaign touch. Only a referrer-less
// or truly external-referrer request is classified at all.
const SEARCH_ENGINE_HOSTS: Array<{ match: string; source: string }> = [
  { match: 'google.', source: 'google' },
  { match: 'bing.', source: 'bing' },
  { match: 'yahoo.', source: 'yahoo' },
  { match: 'duckduckgo.', source: 'duckduckgo' },
  { match: 'baidu.', source: 'baidu' },
];
const SOCIAL_HOSTS: Array<{ match: string; source: string }> = [
  { match: 'facebook.com', source: 'facebook' },
  { match: 'instagram.com', source: 'instagram' },
  { match: 'l.instagram.com', source: 'instagram' },
  { match: 'youtube.com', source: 'youtube' },
  { match: 'linkedin.com', source: 'linkedin' },
  { match: 't.co', source: 'twitter' },
  { match: 'x.com', source: 'twitter' },
];

// Pure — takes the raw Referer header value (or null/empty) and the
// current request's own hostname, returns the touch to record or null to
// leave last-touch untouched. Exported standalone (not baked into
// middleware.ts) so it's unit-testable without an Edge request object.
export function classifyFreshEntrance(refererHeader: string | null | undefined, ownHost: string): Partial<UtmTouch> | null {
  let refHost = '';
  if (refererHeader) {
    try {
      refHost = new URL(refererHeader).hostname.toLowerCase();
    } catch {
      return null; // unparseable referrer — don't guess, leave attribution alone
    }
  }

  const own = (ownHost || '').toLowerCase().replace(/^www\./, '');
  if (refHost && refHost.replace(/^www\./, '') === own) return null; // same-site navigation — not a new entrance

  if (!refHost) return { source: 'direct', medium: 'none' };

  const engine = SEARCH_ENGINE_HOSTS.find((h) => refHost.includes(h.match));
  if (engine) return { source: engine.source, medium: 'organic' };

  const social = SOCIAL_HOSTS.find((h) => refHost.includes(h.match));
  if (social) return { source: social.source, medium: 'social' };

  return { source: refHost, medium: 'referral' };
}

export interface AttributionFields {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  landingPage: string;
  // The path of the visit that set utm_first — the visitor's actual entry
  // point into the site, as opposed to `landingPage` above (the most
  // recent campaign visit's path, from utm_last). Previously parsed out of
  // the utm_first cookie right below and then silently discarded — never
  // returned, never persisted anywhere.
  originalLandingPage: string;
  firstTouchSource: string;
  lastTouchSource: string;
  // Generic advertising click ID, from the last-touch cookie — see
  // UtmTouch.clickId's comment. Empty string when the last touch carried
  // none (an organic/direct/non-click-based visit).
  clickId: string;
  clickIdType: string;
}

const EMPTY_ATTRIBUTION: AttributionFields = {
  utmSource: '', utmMedium: '', utmCampaign: '', utmTerm: '', utmContent: '',
  landingPage: '', originalLandingPage: '', firstTouchSource: '', lastTouchSource: '',
  clickId: '', clickIdType: '',
};

// Reads the utm_first/utm_last cookies (via whatever cookie-getter the
// caller's request object exposes — NextRequest.cookies.get(name)?.value
// in every current call site) and shapes them into the exact fields
// Lead.create()/Booking.create() expect. Never throws — a missing/garbled
// cookie just means no attribution data, not a failed lead/booking.
export function buildAttributionFields(getCookie: (name: string) => string | undefined): AttributionFields {
  try {
    const last = parseUtmCookie(getCookie(UTM_LAST_COOKIE));
    const first = parseUtmCookie(getCookie(UTM_FIRST_COOKIE));
    return {
      utmSource:   last?.source || '',
      utmMedium:   last?.medium || '',
      utmCampaign: last?.campaign || '',
      utmTerm:     last?.term || '',
      utmContent:  last?.content || '',
      landingPage: last?.landingPage || '',
      originalLandingPage: first?.landingPage || '',
      firstTouchSource: formatTouchSource(first),
      lastTouchSource:  formatTouchSource(last),
      clickId:     last?.clickId || '',
      clickIdType: last?.clickIdType || '',
    };
  } catch {
    return EMPTY_ATTRIBUTION;
  }
}

// A compact "source/medium" display string for the firstTouchSource/
// lastTouchSource fields — e.g. "google/cpc", "instagram/social", or just
// "google" if no medium was set. Empty string (not null) when there's
// nothing to show, so it drops cleanly out of a Mongoose default-'' field.
export function formatTouchSource(touch?: UtmTouch | null): string {
  if (!touch || !touch.source) return '';
  return touch.medium ? `${touch.source}/${touch.medium}` : touch.source;
}
