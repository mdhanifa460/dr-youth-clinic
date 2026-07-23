import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { StoryType } from '@/app/models/StoryType';
import { Story } from '@/app/models/Story';
import { requirePermission } from '@/app/lib/adminAuth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('stories', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const type = await (StoryType as any).findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
    if (!type) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: type });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to update story type' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('stories', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const inUse = await (Story as any).countDocuments({ storyType: params.id });
    if (inUse > 0) {
      return NextResponse.json({ success: false, message: `${inUse} story(ies) use this type — reassign them first.` }, { status: 400 });
    }
    const type = await (StoryType as any).findByIdAndDelete(params.id);
    if (!type) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Story type deleted' });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to delete story type' }, { status: 500 });
  }
}
