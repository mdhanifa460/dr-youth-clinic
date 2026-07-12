import { NextRequest, NextResponse } from 'next/server';
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

    const query: any = {};
    // A city filter should also surface services that target it via the
    // newer `targetLocations` list, or the legacy 'all' value.
    if (location) {
      const loc = location.toLowerCase();
      query.$or = [
        { targetLocations: loc },
        { targetLocations: { $exists: false }, location: { $in: [loc, 'all'] } },
      ];
    }
    if (status) query.status = status;

    const services = await Service.find(query as any).sort({ createdAt: -1 });

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

      const collides = async (slug: string) => {
        const candidates = await Service.find({
          status: 'active',
          $or: targetCities.map((c) => ({
            $or: [
              { targetLocations: c },
              { targetLocations: { $exists: false }, location: { $in: [c, 'all'] } },
            ],
          })),
        } as any).select('location targetLocations urlSlug locationSeo').lean() as any[];
        return candidates.some((s) =>
          targetCities.some((c) => getServiceCities(s).includes(c) && getEffectiveSlug(s, c) === slug)
        );
      };

      let slug = baseSlug;
      let counter = 1;
      while (await collides(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      service.urlSlug = slug;
    }

    await service.save();

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
