// Guesses the visitor's branch from Vercel's IP geolocation headers. Shared by
// middleware.ts (to save the guess) and server-rendered pages that need the
// branch on a visitor's very first request, before that cookie exists.
//
// Vercel sends x-vercel-ip-country-region as the region part of the ISO 3166-2
// code only ("KA", "TN", "KL"), not "IN-KA". The old map keyed on "IN-KA", so it
// never matched and every visitor fell back to Chennai. Accept both forms, and
// only trust the region when the country is India (KA/TN are also codes elsewhere).
// City is checked first so Coimbatore (same state as Chennai) gets its own branch.
export function getLocationFromIpHeaders(headers: Headers): string | null {
  const country = (headers.get("x-vercel-ip-country") || "").toUpperCase();
  if (country && country !== "IN") return null;

  let city = "";
  try {
    city = decodeURIComponent(headers.get("x-vercel-ip-city") || "").toLowerCase();
  } catch {}
  if (/coimbatore|tiruppur|tirupur|erode|pollachi/.test(city)) return "coimbatore";
  if (/bengaluru|bangalore/.test(city)) return "bangalore";
  if (/chennai/.test(city)) return "chennai";
  if (/kochi|cochin|ernakulam/.test(city)) return "kochi";

  const rawRegion = (headers.get("x-vercel-ip-country-region") ?? headers.get("x-geo-country") ?? "").toUpperCase();
  const region = rawRegion.startsWith("IN-") ? rawRegion.slice(3) : rawRegion;
  const regionLocationMap: Record<string, string> = {
    TN: "chennai",
    KA: "bangalore",
    KL: "kochi",
  };
  return regionLocationMap[region] || null;
}
