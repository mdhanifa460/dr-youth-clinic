import { LandingPage } from '@/app/models/LandingPage';

// Shared by the create route (app/api/admin/landing-pages/route.ts) and the
// duplicate route (app/api/admin/landing-pages/[id]/duplicate/route.ts) —
// pulled out so both generate a colliding-free slug the exact same way,
// rather than the duplicate route reimplementing its own variant.
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// One query covering every slug a `-1`, `-2`, ... counter loop could land
// on, instead of a sequential findOne per candidate suffix.
export async function generateUniqueLandingPageSlug(baseSlugInput: string): Promise<string> {
  const baseSlug = toSlug(baseSlugInput);
  const escapedBase = baseSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const conflictingPages = await (LandingPage as any)
    .find({ slug: { $regex: `^${escapedBase}(-\\d+)?$` } })
    .select('slug')
    .lean();
  const takenSlugs = new Set((conflictingPages as any[]).map((p) => p.slug));

  let slug = baseSlug;
  let counter = 1;
  while (takenSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}
