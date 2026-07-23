import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Story } from '@/app/models/Story';
import { requirePermission } from '@/app/lib/adminAuth';
import { revalidateTag } from 'next/cache';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('stories', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const story = await (Story as any).findById(params.id).populate('storyType', 'name icon slug').lean();
    if (!story) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: story });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch story' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('stories', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    if (!body.slug && body.title) {
      const base = slugify(body.title);
      let slug = base;
      let counter = 1;
      while (await (Story as any).exists({ slug, _id: { $ne: params.id } })) {
        slug = `${base}-${counter}`;
        counter++;
      }
      body.slug = slug;
    }
    const story = await (Story as any).findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
    if (!story) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    revalidateTag('stories');
    return NextResponse.json({ success: true, data: story });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: 'That slug is already in use' }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to update story' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('stories', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const story = await (Story as any).findByIdAndDelete(params.id);
    if (!story) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    revalidateTag('stories');
    return NextResponse.json({ success: true, message: 'Story deleted' });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to delete story' }, { status: 500 });
  }
}
