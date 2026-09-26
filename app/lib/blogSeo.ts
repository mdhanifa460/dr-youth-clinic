// Shared resolution helpers for per-city Blog SEO — same role and shape as
// app/lib/serviceSeo.ts, minus urlSlug: a blog post's slug is a single
// globally-unique field (see Blog's unique index on `slug`), never varied
// per city, so there is no per-city slug to resolve — only metaTitle/
// metaDescription can be overridden per city. Used by both the admin
// BlogForm (editing) and the public blog routes (rendering), so "what does
// city X actually see" logic only lives in one place.

export const ALL_BLOG_CITIES = ['chennai', 'bangalore', 'coimbatore', 'kochi'] as const;

export interface BlogLocationSeoLike {
  location: string;
  metaTitle?: string;
  metaDescription?: string;
  isCustomized?: boolean;
}

export interface BlogLocationShapeLike {
  targetLocations?: string[];
}

export interface BlogSeoShapeLike extends BlogLocationShapeLike {
  metaTitle?: string;
  metaDescription?: string;
  title: string;
  excerpt?: string;
  locationSeo?: BlogLocationSeoLike[];
}

/**
 * Which cities a post is shown at under /[location]/blog/[slug], in
 * addition to the always-available generic /blog/[slug]. Unset/empty means
 * the post only exists at the generic URL — unchanged, backward-compatible
 * default for every post created before this existed.
 */
export function getBlogCities(post: BlogLocationShapeLike): string[] {
  return post.targetLocations && post.targetLocations.length > 0 ? post.targetLocations : [];
}

/**
 * The effective title/description for one city — the per-city override if
 * one exists, otherwise the post-level shared default (metaTitle/
 * metaDescription, falling back to title/excerpt exactly like the generic
 * /blog/[slug] route already does).
 */
export function getEffectiveBlogSeo(post: BlogSeoShapeLike, city: string) {
  const override = post.locationSeo?.find((l) => l.location === city);
  return {
    metaTitle: override?.metaTitle || post.metaTitle || post.title,
    metaDescription: override?.metaDescription || post.metaDescription || post.excerpt || post.title,
    isCustomized: !!override?.isCustomized,
  };
}

/** True if this post is shown at the given city's /[location]/blog/[slug] URL. */
export function isBlogAtCity(post: BlogLocationShapeLike, city: string): boolean {
  return getBlogCities(post).includes(city);
}

// A title that already names the city's region (e.g. "... in Kerala" for Kochi)
// is already location-specific — appending the city would read "in Kerala in Kochi".
const CITY_ALIASES: Record<string, string[]> = {
  kochi: ['Kerala', 'Cochin'],
  bangalore: ['Bengaluru', 'Karnataka'],
  chennai: ['Tamil Nadu'],
  coimbatore: ['Tamil Nadu'],
};

/**
 * Adds the city to a page title when it isn't already there, placing it before
 * any trailing "| DR Youth Clinic" brand suffix (the root layout's title
 * template re-appends the brand, so leaving it in would double it).
 */
export function withCityInTitle(title: string, cityName: string): string {
  const stripped = title.replace(/\s*[|\u2013-]\s*DR Youth Clinic\s*$/i, '').trim();
  const lower = stripped.toLowerCase();
  const names = [cityName, ...(CITY_ALIASES[cityName.toLowerCase()] ?? [])];
  if (names.some((n) => lower.includes(n.toLowerCase()))) return stripped;
  return `${stripped} in ${cityName}`;
}
