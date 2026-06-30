import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { Review } from '@/app/models/Review';

const PATCH_ALLOWED = [
  'isVisible', 'isFeatured', 'showOnHomepage', 'displayOrder',
  'authorName', 'authorAvatar', 'rating', 'reviewText',
  'videoUrl', 'videoThumbnail', 'services', 'location', 'reviewDate',
] as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await req.json();
    // Allowlist fields — never forward raw body to $set
    const patch: Record<string, any> = {};
    for (const key of PATCH_ALLOWED) {
      if (key in body) patch[key] = body[key];
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ success: false, message: 'No valid fields' }, { status: 400 });
    }
    const review = await (Review as any).findByIdAndUpdate(params.id, { $set: patch }, { new: true }).lean();
    if (!review) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    revalidateTag('reviews');
    return NextResponse.json({ success: true, review });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await req.json();
    const update: Record<string, any> = {
      authorName: body.authorName?.trim(),
      authorAvatar: body.authorAvatar || '',
      rating: body.rating !== undefined ? Number(body.rating) : undefined,
      reviewText: body.reviewText?.trim() || '',
      videoUrl: body.videoUrl || '',
      videoThumbnail: body.videoThumbnail || '',
      services: Array.isArray(body.services) ? body.services.filter(Boolean) : [],
      location: body.location || '',
      isFeatured: Boolean(body.isFeatured),
      isVisible: body.isVisible !== false,
      showOnHomepage: body.showOnHomepage !== false,
      displayOrder: Number(body.displayOrder) || 0,
      reviewDate: body.reviewDate ? new Date(body.reviewDate) : undefined,
    };
    // Remove undefined keys
    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

    const review = await (Review as any).findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true }
    ).lean();
    if (!review) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    revalidateTag('reviews');
    return NextResponse.json({ success: true, review });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const deleted = await (Review as any).findByIdAndDelete(params.id);
    if (!deleted) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    revalidateTag('reviews');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
