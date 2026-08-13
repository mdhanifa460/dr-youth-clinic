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
}

const EMPTY_ATTRIBUTION: AttributionFields = {
  utmSource: '', utmMedium: '', utmCampaign: '', utmTerm: '', utmContent: '',
  landingPage: '', originalLandingPage: '', firstTouchSource: '', lastTouchSource: '',
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
