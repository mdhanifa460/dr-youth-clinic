import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Video } from '@/app/models/Video';
import { requirePermission } from '@/app/lib/adminAuth';

export async function GET(req: NextRequest) {
  const denied = await requirePermission('videos', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const excludeId = searchParams.get('excludeId');

    if (!slug) {
      return NextResponse.json({ success: false, message: 'slug is required' }, { status: 400 });
    }

    const baseQuery: any = { slug };
    if (excludeId) baseQuery._id = { $ne: excludeId };

    const existing = await Video.findOne(baseQuery).select('_id').lean();
    if (!existing) {
      return NextResponse.json({ success: true, available: true });
    }

    // One query for every slug this counter loop could possibly land on
    // (`slug`, `slug-1`, `slug-2`, ...) instead of one sequential findOne
    // per candidate suffix — a real round trip either way, but now exactly
    // one instead of N.
    const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const conflicting = await Video.find({
      slug: { $regex: `^${escaped}(-\\d+)?$` },
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    } as any).select('slug').lean() as any[];
    const takenSlugs = new Set(conflicting.map((v: any) => v.slug));

    let counter = 1;
    let suggestion = `${slug}-${counter}`;
    while (takenSlugs.has(suggestion)) {
      counter++;
      suggestion = `${slug}-${counter}`;
    }

    return NextResponse.json({ success: true, available: false, suggestion });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to check slug' }, { status: 500 });
  }
}
