import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Review } from '@/app/models/Review';
import { getSettings } from '@/app/models/Settings';
import { PUBLIC_REVIEW_FIELDS } from '@/app/models/Review';
import { getSiteConfig } from '@/app/lib/siteConfig';

export const revalidate = 60;

export async function GET(req: NextRequest) {
  try {
    // Reviews stay off the public site until "Before / After and Patient
    // Reviews" is switched on (Settings → Public Display, NMC guidelines).
    if (!(await getSiteConfig()).showBeforeAfterOnPublic) {
      return NextResponse.json({ success: true, reviews: [] });
    }
    await connectDB();
    const { searchParams } = req.nextUrl;
    const settings = await getSettings();
    const minRating = settings.content?.testimonialMinRating ?? 1;

    const filter: Record<string, any> = {
      isVisible: true,
      showOnHomepage: true,
      rating: { $gte: minRating },
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
      .select(PUBLIC_REVIEW_FIELDS)
      .lean();

    return NextResponse.json({ success: true, reviews });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
