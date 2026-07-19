import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { LandingPage } from '@/app/models/LandingPage';
import { requirePermission } from '@/app/lib/adminAuth';

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

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

    const pages = await (LandingPage as any).find(query)
      .sort({ createdAt: -1 })
      .select('title slug status template analytics createdAt updatedAt')
      .lean();

    return NextResponse.json({ success: true, data: pages });
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

    // Generate and ensure unique slug
    const baseSlug = body.slug ? toSlug(body.slug) : toSlug(body.title || 'landing-page');
    let slug = baseSlug;
    let counter = 1;
    while (await (LandingPage as any).findOne({ slug }).select('_id').lean()) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

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
