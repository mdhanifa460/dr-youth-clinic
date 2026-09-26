import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { getCachedCategories } from '@/app/lib/getCachedCategories';
import { getEffectiveSlug } from '@/app/lib/serviceSeo';

// Feeds the Navbar's Services mega menu (loaded lazily on first hover/open,
// not in the layout, so no page pays for it up front). Public, read-only,
// city-scoped: category → active services with the slug that resolves at
// that city (per-city slug overrides included), same rules as the service
// routes themselves.
const CITIES = ['chennai', 'bangalore', 'coimbatore', 'kochi'];

const getNavServices = unstable_cache(
  async (city: string) => {
    await connectDB();
    const [svcs, categories] = await Promise.all([
      (Service as any)
        .find({
          status: 'active',
          $or: [{ targetLocations: city }, { targetLocations: { $exists: false }, location: { $in: [city, 'all'] } }],
        })
        .select('name category urlSlug locationSeo targetLocations location')
        .sort({ createdAt: 1 })
        .limit(300)
        .lean(),
      getCachedCategories(),
    ]);
    return (categories as any[])
      .map((c) => ({
        slug: c.slug as string,
        label: c.label as string,
        icon: (c.icon as string) || '',
        tagline: (c.tagline as string) || '',
        services: (svcs as any[])
          .filter((s) => s.category === c.dbKey && s.name)
          .map((s) => ({ name: s.name as string, slug: getEffectiveSlug(s, city) }))
          .filter((s) => s.slug),
      }))
      .filter((c) => c.services.length > 0);
  },
  ['nav-services-by-city'],
  { revalidate: 300, tags: ['services', 'categories'] }
);

export async function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get('city') || 'chennai').toLowerCase();
  const city = CITIES.includes(raw) ? raw : 'chennai';
  try {
    const categories = await getNavServices(city);
    return NextResponse.json(
      { success: true, city, categories },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch {
    return NextResponse.json({ success: false, categories: [] }, { status: 500 });
  }
}
