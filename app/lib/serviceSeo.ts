// Shared resolution helpers for per-city Service SEO. Used by both the admin
// ServiceForm (editing) and the public service routes (rendering), so the
// "what does city X actually see" logic only lives in one place.

export const ALL_SERVICE_CITIES = ['chennai', 'bangalore', 'coimbatore', 'kochi'] as const;

export interface ServiceLocationSeoLike {
  location: string;
  metaTitle?: string;
  metaDescription?: string;
  urlSlug?: string;
  isCustomized?: boolean;
}

// Minimal shape needed to resolve which cities a service targets — callers
// that only need getServiceCities/isServiceAtCity (e.g. an admin list view
// that never fetched metaTitle/metaDescription/urlSlug) shouldn't have to
// satisfy the fuller SEO shape below just to call them.
export interface ServiceLocationShapeLike {
  location: string;
  targetLocations?: string[];
}

export interface ServiceSeoShapeLike extends ServiceLocationShapeLike {
  metaTitle: string;
  metaDescription: string;
  urlSlug: string;
  locationSeo?: ServiceLocationSeoLike[];
}

/**
 * Which cities a service is actually shown at. Prefers the explicit
 * `targetLocations` list; falls back to the legacy single `location` field
 * (a specific city, or 'all' meaning every city) for documents created
 * before per-city targeting existed.
 */
export function getServiceCities(svc: ServiceLocationShapeLike): string[] {
  if (svc.targetLocations && svc.targetLocations.length > 0) return svc.targetLocations;
  if (svc.location === 'all') return [...ALL_SERVICE_CITIES];
  return svc.location ? [svc.location] : [];
}

/**
 * The effective title/description/slug for one city — the per-city override
 * if one exists, otherwise the service-level shared default.
 */
export function getEffectiveSeo(svc: ServiceSeoShapeLike, city: string) {
  const override = svc.locationSeo?.find((l) => l.location === city);
  return {
    metaTitle: override?.metaTitle || svc.metaTitle,
    metaDescription: override?.metaDescription || svc.metaDescription,
    urlSlug: override?.urlSlug || svc.urlSlug,
    isCustomized: !!override?.isCustomized,
  };
}

/** The effective URL slug for one city — used to resolve `/[location]/services/.../[slug]`. */
export function getEffectiveSlug(svc: ServiceSeoShapeLike, city: string): string {
  return svc.locationSeo?.find((l) => l.location === city)?.urlSlug || svc.urlSlug;
}

/** True if this service is shown at the given city at all. */
export function isServiceAtCity(svc: ServiceLocationShapeLike, city: string): boolean {
  return getServiceCities(svc).includes(city);
}
