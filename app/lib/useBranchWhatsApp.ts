'use client';

// Resolves the visitor's actual branch's WhatsApp number instead of one
// sitewide number — a Chennai visitor tapping "WhatsApp us" should reach
// the Chennai desk, not whichever number happens to be configured
// globally. Location is detected the same way Navbar.tsx already does
// (URL path segment first, then the preferred_location cookie set by
// middleware.ts from IP geolocation); once known, fetches that branch's
// number via /api/branch-whatsapp. Returns `fallback` until (or unless) a
// location signal and branch-specific number are both found.
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { locations } from '@/app/data/locations';
import { parseUtmCookie, UTM_LAST_COOKIE, UTM_FIRST_COOKIE } from '@/app/lib/utmAttribution';
import { encodeAttributionToken, type WaAttributionPayload } from '@/app/lib/whatsappAttribution';

const CITY_SLUGS = Object.keys(locations);

export function toWaLink(value: string): string {
  if (!value) return '';
  if (value.includes('wa.me') || value.includes('whatsapp.com')) return value;
  return `https://wa.me/${value.replace(/\D/g, '')}`;
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

// Reads the visitor's current attribution off the EXISTING utm_last/
// utm_first cookies (app/lib/utmAttribution.ts) and the EXISTING visitor_id
// cookie (middleware.ts) — no second attribution read path, no second
// visitor identity, just reused client-side. Last touch wins (same
// precedence buildAttributionFields() already uses server-side for website
// bookings), falling back to first touch only for the fields last touch
// didn't set.
export function readWaAttribution(): WaAttributionPayload {
  const last = parseUtmCookie(readCookie(UTM_LAST_COOKIE));
  const first = parseUtmCookie(readCookie(UTM_FIRST_COOKIE));
  const visitorId = readCookie('visitor_id') || '';
  return {
    a: visitorId || undefined,
    s: last?.source || first?.source || undefined,
    m: last?.medium || first?.medium || undefined,
    c: last?.campaign || first?.campaign || undefined,
    ci: last?.clickId || first?.clickId || undefined,
    cit: last?.clickIdType || first?.clickIdType || undefined,
  };
}

// Appends the encoded attribution token to a WhatsApp CTA's prefilled
// message as a trailing line — see whatsappAttribution.ts's own comment
// for exactly what this is (and isn't). A visitor with no attribution data
// at all (e.g. cookies blocked) gets the message unchanged; nothing here
// ever blocks the CTA from working.
//
// Deliberately NOT called directly inside a component's render body: a
// Server Component has no `document`, so the SSR-rendered href would omit
// the token while the client's first render (which DOES see cookies)
// would include it — a real hydration mismatch, not a hypothetical one
// (caught live during this phase's own verification). useAttributedWaText
// below is the safe way to use this: it starts with the plain message
// (identical to what SSR produced) and only adds the token in a
// post-mount effect, exactly the same two-phase pattern useBranchWhatsApp
// itself already uses for the branch-specific number below.
export function attachAttributionToken(message: string): string {
  const token = encodeAttributionToken(readWaAttribution());
  return token ? `${message}\n\n(ref: ${token})` : message;
}

// The safe, hydration-mismatch-free way to get an attribution-tagged
// WhatsApp message in a component. See attachAttributionToken's comment
// for why this can't just be called inline during render.
export function useAttributedWaText(message: string): string {
  const [text, setText] = useState(message);
  useEffect(() => {
    const attributed = attachAttributionToken(message);
    if (attributed !== message) setText(attributed);
    // Intentionally re-runs only when the base message itself changes —
    // the attribution cookies don't change within a single page visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);
  return text;
}

// `explicitLocation` — when the caller already knows the visitor's branch
// more precisely than pathname/cookie inference can (e.g. AI Beauty
// Journey's own Branch Selection step, Module 8), it takes priority over
// both. Neither of those two flows apply on non-location-scoped routes
// like /plan-my-journey or /skin-quiz, so without this override those
// pages could never resolve a branch-specific number at all.
export function useBranchWhatsApp(fallback: string, explicitLocation?: string): string {
  const pathname = usePathname();
  const [number, setNumber] = useState(fallback);

  useEffect(() => {
    const fromExplicit = (explicitLocation || '').toLowerCase();
    let location = CITY_SLUGS.includes(fromExplicit) ? fromExplicit : '';
    if (!location) {
      const fromPath = (pathname.split('/')[1] || '').toLowerCase();
      location = CITY_SLUGS.includes(fromPath) ? fromPath : '';
    }
    if (!location) {
      const match = document.cookie.match(/(?:^|; )preferred_location=([^;]+)/);
      const fromCookie = match ? decodeURIComponent(match[1]).toLowerCase() : '';
      if (CITY_SLUGS.includes(fromCookie)) location = fromCookie;
    }
    if (!location) return;

    let cancelled = false;
    fetch(`/api/branch-whatsapp?location=${location}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.data.whatsapp) setNumber(data.data.whatsapp);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [pathname, explicitLocation]);

  return number;
}
