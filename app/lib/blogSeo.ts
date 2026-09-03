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
