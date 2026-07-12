import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { requirePermission } from '@/app/lib/adminAuth';
import { ALL_SERVICE_CITIES, getServiceCities, getEffectiveSlug } from '@/app/lib/serviceSeo';

export async function GET(req: NextRequest) {
  const denied = await requirePermission('services', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    // `locations` (comma-separated, new multi-city form) takes priority;
    // `location` (single value, legacy) is still accepted for compatibility.
    const locationsParam = searchParams.get('locations');
    const location = searchParams.get('location');
    const excludeId = searchParams.get('excludeId');

    const targetCities = locationsParam
      ? locationsParam.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean)
      : location === 'all' ? [...ALL_SERVICE_CITIES] : location ? [location] : [];

    if (!slug || targetCities.length === 0) {
      return NextResponse.json(
        { success: false, message: 'slug and location(s) are required' },
        { status: 400 }
      );
    }

    const cityFilter = {
      $or: targetCities.map((c) => ({
        $or: [
          { targetLocations: c },
          { targetLocations: { $exists: false }, location: { $in: [c, 'all'] } },
        ],
      })),
    };

    const collides = async (candidateSlug: string) => {
      const candidates = await Service.find({
        status: 'active',
        ...cityFilter,
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      } as any).select('location targetLocations urlSlug locationSeo').lean() as any[];
      return candidates.some((s) =>
        targetCities.some((c) => getServiceCities(s).includes(c) && getEffectiveSlug(s, c) === candidateSlug)
      );
    };

    if (!(await collides(slug))) {
      return NextResponse.json({ success: true, available: true });
    }

    // Find a non-conflicting slug suggestion
    let counter = 1;
    let suggestion = `${slug}-${counter}`;
    while (await collides(suggestion)) {
      counter++;
      suggestion = `${slug}-${counter}`;
    }

    return NextResponse.json({ success: true, available: false, suggestion });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to check slug' },
      { status: 500 }
    );
  }
}
