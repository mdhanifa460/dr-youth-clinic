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

    let counter = 1;
    let suggestion = `${slug}-${counter}`;
    while (
      await Video.findOne({ slug: suggestion, ...(excludeId ? { _id: { $ne: excludeId } } : {}) } as any)
        .select('_id')
        .lean()
    ) {
      counter++;
      suggestion = `${slug}-${counter}`;
    }

    return NextResponse.json({ success: true, available: false, suggestion });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to check slug' }, { status: 500 });
  }
}
