import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_COOKIE = "admin_session";
const LOCATION_COOKIE = "preferred_location";
const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.ADMIN_PASSWORD ||
  "change-this-admin-session-secret";

const VALID_LOCATIONS = ["chennai", "bangalore", "coimbatore", "kochi"];

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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isLocationPage = /^\/[a-z]+$/.test(pathname) && VALID_LOCATIONS.includes(pathname.slice(1));

  if (isAdminPage || isAdminApi) {
    if (pathname === "/admin/login" || pathname === "/api/admin/login") {
      return NextResponse.next();
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

    return NextResponse.next();
  }

  // Location detection and redirect
  if (pathname === "/" && req.headers.get("x-geo-country")) {
    const country = req.headers.get("x-geo-country");
    const preferredLocation = req.cookies.get(LOCATION_COOKIE)?.value;

    const detectedLocation = !preferredLocation ? getLocationFromCountry(country) : preferredLocation;

    if (detectedLocation && VALID_LOCATIONS.includes(detectedLocation)) {
      const response = NextResponse.next();
      response.cookies.set(LOCATION_COOKIE, detectedLocation, {
        maxAge: 60 * 60 * 24 * 365,
        secure: true,
        sameSite: "lax",
      });
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/"],
};
