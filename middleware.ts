import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { extractUtmParams, UTM_FIRST_COOKIE, UTM_LAST_COOKIE, UTM_FIRST_MAX_AGE, UTM_LAST_MAX_AGE } from "@/app/lib/utmAttribution";
import { extractMigrationParams, MIGRATION_FIRST_COOKIE, MIGRATION_FIRST_MAX_AGE } from "@/app/lib/migrationAttribution";
import { normalizeOldUrl } from "@/app/lib/domainMigration/parseSitemap";
import { getCachedRedirect } from "@/app/lib/domainMigration/redirectCache";

const ADMIN_COOKIE = "admin_session";
const LOCATION_COOKIE = "preferred_location";
// Must mirror the exact fallback chain in app/lib/adminAuth.ts — that file
// signs session cookies with this same chain, so if the two ever diverge,
// middleware verifies against a different secret than the one sessions were
// actually signed with, and legitimately logged-in admins get locked out.
const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.ADMIN_PASSWORD ||
  "change-this-admin-session-secret";

const VALID_LOCATIONS = ["chennai", "bangalore", "coimbatore", "kochi"];
const VISITOR_COOKIE = "visitor_id";

// Personalization engine foundation (Phase 1) — a random, non-PII visitor
// identifier, set on whichever public page the visitor lands on first
// (not just "/" — most visitors arrive via search/ads on a blog post or
// service page, never the homepage). No name/email/phone is ever stored
// against this; it only ever labels anonymous InterestEvent rows so a
// later page (e.g. the homepage) can look up that visitor's own event
// history. `crypto.randomUUID()` is available in the Edge runtime
// middleware runs in, same as sessionId generation elsewhere in the app.
function ensureVisitorId(req: NextRequest, res: NextResponse) {
  if (req.cookies.get(VISITOR_COOKIE)?.value) return;
  res.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    secure: true,
    sameSite: "lax",
  });
}

// Campaign attribution — only writes cookies on a visit whose URL actually
// carries utm_* params (an ad click, an email link, a QR code with UTMs
// appended), so most page loads are a no-op here. `utm_last` is always
// overwritten on such a visit (whichever campaign most recently sent this
// visitor is "last touch"); `utm_first` is written once and never again,
// so the very first campaign that ever brought this visitor stays intact
// even after later campaigns overwrite `utm_last`. Both feed
// Lead/Booking.utmSource etc. at submission time (see utmAttribution.ts).
function captureUtmAttribution(req: NextRequest, res: NextResponse) {
  const utm = extractUtmParams(req.nextUrl.searchParams);
  if (Object.keys(utm).length === 0) return;

  const payload = JSON.stringify({
    ...utm,
    landingPage: req.nextUrl.pathname,
    capturedAt: new Date().toISOString(),
  });
  const cookieOpts = { path: "/", secure: true, sameSite: "lax" as const };

  res.cookies.set(UTM_LAST_COOKIE, payload, { ...cookieOpts, maxAge: UTM_LAST_MAX_AGE });
  if (!req.cookies.get(UTM_FIRST_COOKIE)?.value) {
    res.cookies.set(UTM_FIRST_COOKIE, payload, { ...cookieOpts, maxAge: UTM_FIRST_MAX_AGE });
  }
}

// Domain-migration marker — entirely separate cookie/param space from
// captureUtmAttribution above (see app/lib/migrationAttribution.ts for
// why), so a request carrying both a real utm_* campaign AND the old
// domain's migration_source marker gets full, correct treatment from
// both: this never touches utm_first/utm_last, and captureUtmAttribution
// never touches this. Write-once, like utm_first — the very first
// old-domain-tagged visit is what matters; a rare second one later must
// not reset which visit gets credited as this lead's origin.
function captureMigrationMarker(req: NextRequest, res: NextResponse) {
  const migration = extractMigrationParams(req.nextUrl.searchParams);
  if (!migration) return;
  if (req.cookies.get(MIGRATION_FIRST_COOKIE)?.value) return;

  const payload = JSON.stringify({
    ...migration,
    landingPage: req.nextUrl.pathname,
    capturedAt: new Date().toISOString(),
  });
  res.cookies.set(MIGRATION_FIRST_COOKIE, payload, {
    path: "/", secure: true, sameSite: "lax", maxAge: MIGRATION_FIRST_MAX_AGE,
  });
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function signSessionId(sessionId: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(ADMIN_SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(sessionId)
  );

  return bytesToHex(signature);
}

async function hasValidSignedSession(value?: string) {
  if (!value) return false;

  const [sessionId, signature] = value.split(".");
  if (!sessionId || !signature) return false;

  return signature === await signSessionId(sessionId);
}

function getLocationFromCountry(country?: string): string | null {
  if (!country) return null;

  const countryLocationMap: Record<string, string> = {
    "IN-TN": "chennai",
    "IN-KA": "bangalore",
    "IN-KL": "kochi",
  };

  return countryLocationMap[country] || null;
}

function withPathname(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (isAdminPage || isAdminApi) {
    if (pathname === "/admin/login" || pathname === "/api/admin/login") {
      return withPathname(req);
    }

    const hasSession = await hasValidSignedSession(
      req.cookies.get(ADMIN_COOKIE)?.value
    );

    if (!hasSession) {
      if (isAdminApi) {
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 }
        );
      }

      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return withPathname(req);
  }

  // Domain Migration — approved-redirect check, ahead of everything else
  // in the public branch. Exists specifically because app/not-found.tsx's
  // own lookup (Domain Migration Phase 3) doesn't reliably work for old
  // URLs that happen to collide with a single-segment SSG dynamic route
  // (app/(public)/[location]/page.tsx) — a confirmed, pre-existing Next.js
  // 14.2.35 bug where that route's own notFound()/redirect() calls don't
  // propagate a correct HTTP status. Checking here instead means this can
  // never depend on any downstream page's rendering pipeline at all — a
  // hit short-circuits before any of the cookie/attribution work below,
  // since a request about to redirect away doesn't need any of that.
  // Cheap Redis GET, never throws (see redirectCache.ts) — a miss (the
  // overwhelming majority of real page requests) or any Redis hiccup just
  // falls through to normal handling exactly as if this block didn't
  // exist; the not-found.tsx lookup remains a second, Mongo-backed
  // fallback for multi-segment old URLs.
  const cachedRedirect = await getCachedRedirect(normalizeOldUrl(pathname));
  if (cachedRedirect) {
    return NextResponse.redirect(new URL(cachedRedirect, req.url), 308);
  }

  // Also carries x-pathname on every public request now (previously only
  // set for /admin routes) — required so app/not-found.tsx (Server
  // Component, no direct access to the failed URL otherwise) can read the
  // path that 404'd and look it up against approved redirect mappings.
  // Also fixes a latent gap: Footer.tsx's city-from-URL detection already
  // reads this same header and was silently falling back to the cookie/
  // default on any public page with a city segment, since the header was
  // never set outside /admin before now.
  const response = withPathname(req);

  // Location detection — only run when no cookie is set yet to avoid redundant Set-Cookie on every request
  if (pathname === "/" && !req.cookies.get(LOCATION_COOKIE)?.value) {
    const country = req.headers.get("x-vercel-ip-country-region") ?? req.headers.get("x-geo-country");
    const detectedLocation = getLocationFromCountry(country ?? undefined);

    if (detectedLocation && VALID_LOCATIONS.includes(detectedLocation)) {
      response.cookies.set(LOCATION_COOKIE, detectedLocation, {
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
        secure: true,
        sameSite: "lax",
      });
    }
  }

  ensureVisitorId(req, response);
  captureUtmAttribution(req, response);
  captureMigrationMarker(req, response);
  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    // Every public page — needed so a first-time visitor gets a visitor_id
    // regardless of which page they land on first (search/ad traffic rarely
    // enters through "/"). Excludes /api (its own routes read the cookie
    // directly, no need to re-run this), static assets, and Next internals.
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
  ],
};
