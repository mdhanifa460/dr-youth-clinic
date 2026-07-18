import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { Review } from '@/app/models/Review';
import { requirePermission } from '@/app/lib/adminAuth';

export async function GET(req: NextRequest) {
  const denied = await requirePermission('reviews', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const { searchParams } = req.nextUrl;

    const filter: Record<string, string> = {};
    const source = searchParams.get('source');
    if (source && source !== 'all') filter.source = String(source);
    const location = searchParams.get('location');
    if (location && location !== 'all') filter.location = String(location);

    const reviews = await Review.find(filter as any)
      .sort({ isFeatured: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, reviews });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission('reviews', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();

    if (!body.authorName?.trim()) {
      return NextResponse.json({ success: false, message: 'Author name is required' }, { status: 400 });
    }

    const review = await Review.create({
      source: body.source || 'manual',
      // Omit entirely rather than passing `undefined`/`null` through —
      // belt-and-suspenders alongside the partial unique index fix on
      // {source, sourceId} (see Review.ts), so a manual review never even
      // risks tripping the Google-review-dedupe constraint.
      ...(body.sourceId ? { sourceId: body.sourceId } : {}),
      authorName: body.authorName.trim(),
      authorAvatar: body.authorAvatar || '',
      rating: body.rating ? Number(body.rating) : undefined,
      reviewText: body.reviewText?.trim() || '',
      videoUrl: body.videoUrl || '',
      videoThumbnail: body.videoThumbnail || '',
      services: Array.isArray(body.services) ? body.services.filter(Boolean) : [],
      location: body.location || '',
      isFeatured: Boolean(body.isFeatured),
      isVisible: body.isVisible !== false,
      showOnHomepage: body.showOnHomepage !== false,
      displayOrder: Number(body.displayOrder) || 0,
      reviewDate: body.reviewDate ? new Date(body.reviewDate) : new Date(),
      meta: body.meta || {},
    });

    revalidateTag('reviews');
    return NextResponse.json({ success: true, review }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
