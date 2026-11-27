'use client';

// Saving the visitor's branch from the browser, and finding the nearest clinic
// from a GPS position. The middleware writes the same two cookies on the server.
//
// preferred_location      the branch every page uses (footer, phone, WhatsApp...)
// preferred_location_src  how we know it, which decides what may replace it:
//   manual  the visitor tapped a clinic: nothing automatic replaces it (1 year)
//   gps     precise browser location: IP never replaces it (7 days, then re-checked)
//   city    they opened a city page (set by LocationAutoDetect, 30 days)
//   (none)  guessed from the IP address: the middleware re-checks it on every
//           visit, so a wrong guess (VPN, office proxy, moved city) corrects itself
import { announceLocationChange } from '@/app/lib/locationChange';

export type BranchSource = 'manual' | 'gps' | 'city';

const SOURCE_MAX_AGE: Record<BranchSource, number> = {
  manual: 60 * 60 * 24 * 365,
  gps: 60 * 60 * 24 * 7,
  city: 60 * 60 * 24 * 30,
};

export function readCookie(name: string): string {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : '';
}

export function saveBranch(key: string, source: BranchSource) {
  const secure = location.protocol === 'https:' ? '; secure' : '';
  const attrs = (maxAge: number) => `path=/; max-age=${maxAge}; samesite=lax${secure}`;
  const changed = readCookie('preferred_location') !== key;
  document.cookie = `preferred_location=${encodeURIComponent(key)}; ${attrs(60 * 60 * 24 * 365)}`;
  document.cookie = `preferred_location_src=${source}; ${attrs(SOURCE_MAX_AGE[source])}`;
  // Remove the older flag that preferred_location_src replaced (no longer read).
  document.cookie = `preferred_location_manual=; ${attrs(0)}`;
  if (changed) announceLocationChange();
}

// Approximate city-centre coordinates for each clinic key
export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  chennai:    { lat: 13.0827, lng: 80.2707 },
  bangalore:  { lat: 12.9716, lng: 77.5946 },
  coimbatore: { lat: 11.0168, lng: 76.9558 },
  kochi:      { lat:  9.9312, lng: 76.2673 },
};

// Limits for the silent on-load GPS check. On a desktop without GPS the browser
// guesses the position from the network, which can be hundreds of km off, so only
// a precise position near one of the clinics is used automatically.
export const AUTO_MAX_ACCURACY_M = 5_000;
export const AUTO_MAX_DISTANCE_KM = 100;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function nearestClinic(lat: number, lng: number, available: string[] = Object.keys(CITY_COORDS)) {
  let key = available[0];
  let km = Infinity;
  for (const k of available) {
    const c = CITY_COORDS[k];
    if (!c) continue;
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if (d < km) { km = d; key = k; }
  }
  return { key, km };
}
