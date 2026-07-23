import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Story } from '@/app/models/Story';
import { requirePermission } from '@/app/lib/adminAuth';

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('stories', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const original = await (Story as any).findById(params.id).lean();
    if (!original) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });

    const { _id, slug, createdAt, updatedAt, viewCount, publishedAt, ...rest } = original as any;
    const copy = await Story.create({
      ...rest,
      title: `${original.title} (Copy)`,
      slug: undefined,
      status: 'draft',
      viewCount: 0,
    });

    return NextResponse.json({ success: true, data: copy }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to duplicate story' }, { status: 500 });
  }
}
