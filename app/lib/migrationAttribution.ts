// Domain-migration marker capture — deliberately INDEPENDENT of
// app/lib/utmAttribution.ts's utm_first/utm_last cookies, per explicit
// requirement: a dedicated migration_source/migration_from query-param
// pair (set by the OLD domain's own redirect rule — outside this repo)
// tags a visit as having originated at the old domain, without touching
// or overwriting any real utm_source/utm_medium/utm_campaign a legitimate
// ad/campaign link may also carry on that same request. The two are read
// from different query params and written to different cookies, so a
// visitor who clicks a Google Ad that happens to still point at the old
// domain gets full, correct campaign attribution from utmAttribution.ts
// AND is still correctly marked as an old-domain-origin visit here —
// neither system can clobber the other.
//
// Convention (applied by whoever controls the old domain's redirect):
//   https://dryouthclinics.com{path}
//     ?migration_source=old_domain&migration_from=dryouthclinic.co.in
// Shared by middleware.ts (Edge runtime, writes the cookie) and every
// Lead/Booking creation route (Node runtime, reads it back) — same split
// utmAttribution.ts already uses, for the same reason (no next/headers,
// no Node-only APIs, works identically in both runtimes).

export interface MigrationTouch {
  source: string; // 'old_domain'
  from: string;   // 'dryouthclinic.co.in'
  landingPage?: string;
  capturedAt?: string;
}

export const MIGRATION_FIRST_COOKIE = 'migration_first';
// 90 days — matches utmAttribution.ts's UTM_FIRST_MAX_AGE "first touch"
// window. The whole point of this cookie is to survive long enough that a
// visitor who first arrived via the old domain, then converts weeks
// later, is still correctly attributed as an old-domain-origin lead.
export const MIGRATION_FIRST_MAX_AGE = 60 * 60 * 24 * 90;

// Reads migration_source/migration_from off a URL's search params.
// Returns null when migration_source is absent — the overwhelming
// majority of requests, so callers can cheaply skip writing anything.
export function extractMigrationParams(searchParams: URLSearchParams): { source: string; from: string } | null {
  const source = searchParams.get('migration_source');
  if (!source) return null;
  const from = searchParams.get('migration_from') || '';
  // Same absurdly-long-value guard as extractUtmParams — no real redirect
  // marker needs more than this.
  return { source: source.slice(0, 100), from: from.slice(0, 200) };
}

// Cookie values are JSON — parsed defensively since a cookie is
// user-controllable input, not a trusted internal format.
export function parseMigrationCookie(raw?: string | null): MigrationTouch | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && parsed.source ? parsed : null;
  } catch {
    return null;
  }
}

// 'old' only when the migration_first cookie is genuinely present with
// source 'old_domain' — 'new' otherwise. Deliberately a two-value result,
// not three: a Lead/Booking document created before this field existed
// reads back as undefined at the schema level (Mongoose never
// retroactively applies a new field's default to a pre-existing
// document — confirmed the hard way earlier this session on
// videoAI.autoCategorizeEnabled), which is exactly the "historical —
// unavailable" bucket the dashboard needs to show separately from a
// confirmed 'new'. Only documents created going forward ever get an
// explicit 'old' or 'new' value; callers must not treat the two cases as
// the same "not old" bucket.
export function resolveOriginDomain(getCookie: (name: string) => string | undefined): 'old' | 'new' {
  const touch = parseMigrationCookie(getCookie(MIGRATION_FIRST_COOKIE));
  return touch?.source === 'old_domain' ? 'old' : 'new';
}
