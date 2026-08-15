import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { Service } from '@/app/models/Service';
import { connectDB } from '@/app/lib/mongodb';
import { requirePermission } from '@/app/lib/adminAuth';
import { ALL_SERVICE_CITIES, getServiceCities, getEffectiveSlug } from '@/app/lib/serviceSeo';

export async function GET(req: NextRequest) {
  const denied = await requirePermission('services', 'view');
  if (denied) return denied;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.trim();

    const query: any = {};
    // Combined via $and (not a second top-level $or) since the location
    // filter below already needs its own $or — a second top-level $or key
    // would silently overwrite the first rather than combining with it.
    const andConditions: any[] = [];
    // A city filter should also surface services that target it via the
    // newer `targetLocations` list, or the legacy 'all' value.
    if (location) {
      const loc = location.toLowerCase();
      andConditions.push({
        $or: [
          { targetLocations: loc },
          { targetLocations: { $exists: false }, location: { $in: [loc, 'all'] } },
        ],
      });
    }
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      andConditions.push({ name: new RegExp(escaped, 'i') });
    }
    if (andConditions.length > 0) query.$and = andConditions;

    // Projected to exactly what the admin list page (app/admin/services/
    // page.tsx) actually reads — that page deliberately fetches the whole
    // catalogue once and filters client-side (see its own comment), but
    // was doing so with the FULL document (narrative content, FAQs,
    // keywords, meta description, etc.) for every one of ~80+ services on
    // every single page load — a multi-hundred-KB payload for a list view
    // that only ever shows name/location/category/price/status. Same "safe
    // to cut" field-projection precedent already used by the admin
    // Leads/Intelligence routes.
    const services = await Service.find(query as any)
      .select('name location targetLocations category price currency duration status heroImage createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: services });
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission('services', 'full');
  if (denied) return denied;

  try {
    await connectDB();

    const body = await req.json();
    // Optional enum field — the admin form sends '' when left unanswered,
    // which Mongoose's enum validator rejects (unlike `required`, it doesn't
    // treat '' as "not set").
    if (body.painLevel === '') delete body.painLevel;

    const service = new Service(body);

    // Ensure the shared slug is unique against every city this service will
    // actually be shown at before the pre-save hook runs — a service now
    // targets a SET of cities (targetLocations, or the legacy single
    // `location`/'all'), so uniqueness has to be checked per city, not once.
    if (body.name && body.location) {
      const baseSlug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const targetCities: string[] = body.targetLocations?.length
        ? body.targetLocations
        : body.location === 'all' ? [...ALL_SERVICE_CITIES] : [body.location];

      // The candidate set (which services exist at these cities) doesn't
      // depend on which slug we're testing — collides() used to re-run this
      // exact same query on every while-loop iteration just to check a
      // different candidate slug against it. Fetch once, then loop in JS.
      const candidates = await Service.find({
        status: 'active',
        $or: targetCities.map((c) => ({
          $or: [
            { targetLocations: c },
            { targetLocations: { $exists: false }, location: { $in: [c, 'all'] } },
          ],
        })),
      } as any).select('location targetLocations urlSlug locationSeo').lean() as any[];
      const existingSlugs = new Set<string>();
      for (const s of candidates) {
        for (const c of targetCities) {
          if (getServiceCities(s).includes(c)) existingSlugs.add(getEffectiveSlug(s, c));
        }
      }

      let slug = baseSlug;
      let counter = 1;
      while (existingSlugs.has(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      service.urlSlug = slug;
    }

    await service.save();
    // Without this, a newly-created service wouldn't reach the public
    // service-detail page's cached candidate list (see getServiceCandidates
    // in app/(public)/[location]/services/[category]/[slug]/page.tsx) until
    // that cache's 5-minute revalidate window happened to expire.
    revalidateTag('services');

    return NextResponse.json(
      { success: true, data: service, message: 'Service created successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Service save error:', {
      name: error.name,
      message: error.message,
      errors: error.errors,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    });

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json(
        { success: false, message: messages.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create service' },
      { status: 500 }
    );
  }
}
