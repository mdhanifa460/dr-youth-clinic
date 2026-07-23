import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Story } from '@/app/models/Story';
import { requirePermission } from '@/app/lib/adminAuth';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const denied = await requirePermission('stories', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const storyType = searchParams.get('storyType');
    const search = searchParams.get('search');

    const query: any = {};
    if (status) query.status = status;
    if (storyType) query.storyType = storyType;
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ title: re }, { description: re }, { tags: re }];
    }

    const stories = await (Story as any)
      .find(query)
      .select('-slides')
      .populate('storyType', 'name icon slug')
      .sort({ order: 1, createdAt: -1 })
      .lean();
    return NextResponse.json({ success: true, data: stories });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch stories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission('stories', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const story = await Story.create(body);
    revalidateTag('stories');
    return NextResponse.json({ success: true, data: story }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to create story' }, { status: 500 });
  }
}
