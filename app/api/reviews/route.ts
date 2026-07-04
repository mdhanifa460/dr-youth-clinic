import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Review } from '@/app/models/Review';

export const revalidate = 60;

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = req.nextUrl;

    const filter: Record<string, any> = {
      isVisible: true,
      showOnHomepage: true,
    };

    const source = searchParams.get('source');
    if (source) filter.source = source;

    const location = searchParams.get('location');
    if (location) filter.location = location;

    const service = searchParams.get('service');
    if (service) filter.services = service;

    if (searchParams.get('featured') === '1') filter.isFeatured = true;

    const count = Math.min(Number(searchParams.get('count') || 6), 50);

    const reviews = await Review.find(filter as any)
      .sort({ isFeatured: -1, displayOrder: 1, createdAt: -1 })
      .limit(count)
      .lean();

    return NextResponse.json({ success: true, reviews });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
