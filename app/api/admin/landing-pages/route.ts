import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { LandingPage } from '@/app/models/LandingPage';
import Booking from '@/app/models/Booking';
import { requirePermission } from '@/app/lib/adminAuth';
import { generateUniqueLandingPageSlug } from '@/app/lib/landingPages/uniqueSlug';

export async function GET(req: NextRequest) {
  const denied = await requirePermission('landing-pages', 'view');
  if (denied) return denied;

  try {
    await connectDB();

    const { searchParams } = req.nextUrl;
    const query: Record<string, any> = {};
    const status = searchParams.get('status');
    if (status) query.status = status;
    const template = searchParams.get('template');
    if (template) query.template = template;
    const city = searchParams.get('city');
    if (city) query.city = city;

    const pages = await (LandingPage as any).find(query)
      .sort({ createdAt: -1 })
      .select('title slug status template city analytics createdAt updatedAt')
      .lean();

    // analytics.leads is a counter incremented once at submission time
    // (app/api/lp/[slug]/lead/route.ts) — it only ever goes up, and never
    // reflects a Booking being deleted afterward (a test lead cleaned up,
    // a spam entry removed, any future manual/bulk delete). Left alone,
    // this list silently drifts further from reality every time that
    // happens — an admin sees "6 leads" on a page whose actual Bookings
    // list has 1, with no way to tell from here. leadsLive is a real,
    // computed-at-read-time count of Booking rows that still exist for
    // each page's slug, so it can never drift; analytics.leads is kept
    // as-is (renamed leadsAllTime on the response) for admins who want
    // the historical total.
    const slugs = pages.map((p: any) => p.slug).filter(Boolean);
    const liveCounts = slugs.length
      ? await (Booking as any).aggregate([
          { $match: { lpSlug: { $in: slugs } } },
          { $group: { _id: '$lpSlug', count: { $sum: 1 } } },
        ])
      : [];
    const liveCountBySlug = new Map(liveCounts.map((c: any) => [c._id, c.count]));

    const data = pages.map((p: any) => ({
      ...p,
      leadsLive: liveCountBySlug.get(p.slug) ?? 0,
      leadsAllTime: p.analytics?.leads ?? 0,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching landing pages:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch landing pages' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission('landing-pages', 'full');
  if (denied) return denied;

  try {
    await connectDB();

    const body = await req.json();

    const slug = await generateUniqueLandingPageSlug(body.slug || body.title || 'landing-page');

    const page = new LandingPage({
      ...body,
      slug,
      status: 'draft',
      sections: body.sections || [],
      form: {
        fields: [],
        submitText: 'Book Free Consultation',
        successMessage: "Thank you! We'll call you within 2 hours.",
        whatsappNotify: false,
        ...(body.form || {}),
      },
      tracking: {
        gtmId: '',
        metaPixelId: '',
        googleAdsId: '',
        googleAdsLabel: '',
        ...(body.tracking || {}),
      },
      analytics: { visitors: 0, leads: 0 },
    });

    await page.save();

    return NextResponse.json(
      { success: true, data: page, message: 'Landing page created successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating landing page:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json(
        { success: false, message: messages.join(', ') },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: 'A landing page with this slug already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create landing page' },
      { status: 500 }
    );
  }
}
