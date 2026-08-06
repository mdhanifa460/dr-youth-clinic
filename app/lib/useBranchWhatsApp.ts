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

const CITY_SLUGS = Object.keys(locations);

export function toWaLink(value: string): string {
  if (!value) return '';
  if (value.includes('wa.me') || value.includes('whatsapp.com')) return value;
  return `https://wa.me/${value.replace(/\D/g, '')}`;
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
