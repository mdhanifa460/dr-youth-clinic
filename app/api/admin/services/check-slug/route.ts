import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';

export async function GET(req: NextRequest) {
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

    const baseQuery: any = { urlSlug: slug, location };
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
        location,
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      })
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
