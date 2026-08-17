// Pure href-resolution logic for the Footer's Quick Links / Our Procedures
// columns — split out of app/components/Footer.tsx so it's unit-testable
// without needing to mock next/headers.
//
// Legacy defaults (see app/lib/homepageDefaults.ts) store `/#services` and
// `/#contact` as sentinel values, not literal anchors — no bare /services
// route exists (services are always city-scoped, /[city]/services), so
// these get rewritten here to a real, city-scoped page. From any page other
// than the homepage, following a literal `/#services` anchor lands on "/"
// first, which reads as "the link is broken / redirects to home" — exactly
// the bug this resolves.
export const CITY_SLUGS = ["chennai", "bangalore", "coimbatore", "kochi"];
export const LOCATION_COOKIE = "preferred_location";

// The Service model's category enum (Skin/Hair/Laser/Other) is coarser than
// these per-treatment footer labels, so each label maps to its closest
// category-listing route (/[location]/services/[category]). Only consulted
// when href is still the legacy `/#services` sentinel — any href an admin
// has already customized to a real URL passes through untouched.
export const PROCEDURE_CATEGORY_BY_LABEL: Record<string, string> = {
  "hair transplant": "hair",
  "prp therapy": "hair",
  "gfc therapy": "hair",
  "hair loss treatment": "hair",
  "laser & skin treatments": "laser",
};

export function resolveFooterHref(href: string, label: string, location: string): string {
  if (href === "/#services") {
    const category = PROCEDURE_CATEGORY_BY_LABEL[label.trim().toLowerCase()];
    return category ? `/${location}/services/${category}` : `/${location}/services`;
  }
  if (href === "/#contact") return `/${location}#contact`;
  return href;
}

// Same current/preferred-city resolution Navbar.tsx does client-side (URL
// segment first, else the visitor's saved city, else "chennai") — used
// server-side in Footer.tsx via the x-pathname header middleware.ts already
// sets on every request, plus the preferred_location cookie it already
// writes.
export function resolveFooterLocation(pathname: string, cookieLocation: string): string {
  const firstSegment = pathname.split("/")[1] || "";
  if (CITY_SLUGS.includes(firstSegment)) return firstSegment;
  if (CITY_SLUGS.includes(cookieLocation)) return cookieLocation;
  return "chennai";
}
