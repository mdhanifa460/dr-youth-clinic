import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { LandingPage } from '@/app/models/LandingPage';
import { LandingPageVisit } from '@/app/models/LandingPageVisit';
import { requirePermission } from '@/app/lib/adminAuth';

// Backs the "N visitors" hyperlink on the Landing Pages list/detail pages —
// the actual log behind that counter (app/models/LandingPageVisit.ts).
// Paginated with a plain skip/limit (this is an admin diagnostic view over
// a capped 180-day log, not a hot path that needs cursor pagination).
const PAGE_SIZE = 50;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('landing-pages', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const page = await (LandingPage as any).findById(params.id).select('title slug analytics').lean();
    if (!page) {
      return NextResponse.json({ success: false, message: 'Landing page not found' }, { status: 404 });
    }

    const pageNum = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10) || 1);
    const skip = (pageNum - 1) * PAGE_SIZE;

    const [visits, total] = await Promise.all([
      (LandingPageVisit as any)
        .find({ landingPageId: params.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(PAGE_SIZE)
        .select('source medium campaign referrer device createdAt')
        .lean(),
      (LandingPageVisit as any).countDocuments({ landingPageId: params.id }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        landingPage: { title: page.title, slug: page.slug, totalVisitors: page.analytics?.visitors ?? 0 },
        visits,
        total,
        page: pageNum,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      },
    });
  } catch (error) {
    console.error('Error fetching landing page visits:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch visits' }, { status: 500 });
  }
}
