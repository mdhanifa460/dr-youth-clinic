import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { requirePermission } from '@/app/lib/adminAuth';

export async function GET(req: NextRequest) {
  const denied = await requirePermission('services', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const location = searchParams.get('location');
    const excludeId = searchParams.get('excludeId');

    if (!slug || !location) {
      return NextResponse.json(
        { success: false, message: 'slug and location are required' },
        { status: 400 }
      );
    }

    // An 'all'-location service occupies the slug at every city, so it must
    // not collide with ANY existing service regardless of location; a
    // specific-city service must avoid colliding with that city's slugs AND
    // with any 'all'-location service (which is already showing there too).
    const locationFilter = location === 'all' ? {} : { location: { $in: [location, 'all'] } };

    const baseQuery: any = { urlSlug: slug, ...locationFilter };
    if (excludeId) baseQuery._id = { $ne: excludeId };

    const existing = await Service.findOne(baseQuery).select('_id').lean();

    if (!existing) {
      return NextResponse.json({ success: true, available: true });
    }

    // Find a non-conflicting slug suggestion
    let counter = 1;
    let suggestion = `${slug}-${counter}`;
    while (
      await Service.findOne({
        urlSlug: suggestion,
        ...locationFilter,
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      } as any)
        .select('_id')
        .lean()
    ) {
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
