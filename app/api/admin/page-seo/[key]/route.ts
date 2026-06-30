import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { PageSeo } from '@/app/models/PageSeo';

const PAGE_LABELS: Record<string, string> = {
  home: 'Homepage',
  services: 'Services Listing',
  about: 'About Us',
  contact: 'Contact Us',
  book: 'Book Appointment',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    await connectDB();
    const entry = await PageSeo.findOne({ pageKey: params.key } as any).lean();
    return NextResponse.json({ success: true, data: entry });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    await connectDB();
    const body = await req.json();
    const { metaTitle, metaDescription, keywords, canonicalUrl } = body;

    const entry = await (PageSeo as any).findOneAndUpdate(
      { pageKey: params.key },
      {
        pageKey: params.key,
        pageLabel: PAGE_LABELS[params.key] || params.key,
        metaTitle,
        metaDescription,
        keywords: Array.isArray(keywords)
          ? keywords
          : (keywords ?? '')
              .split(',')
              .map((k: string) => k.trim())
              .filter(Boolean),
        canonicalUrl,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: entry });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json(
        { success: false, message: messages.join(', ') },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, message: 'Failed to save' }, { status: 500 });
  }
}
