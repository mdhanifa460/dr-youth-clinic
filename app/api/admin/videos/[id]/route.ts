import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Video } from '@/app/models/Video';
import { requirePermission } from '@/app/lib/adminAuth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('videos', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const video = await (Video as any).findById(params.id).populate('doctor').populate('service', 'name urlSlug');
    if (!video) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: video });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch video' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('videos', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const video = await (Video as any).findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
    if (!video) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: video, message: 'Video updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to update video' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('videos', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const video = await (Video as any).findByIdAndDelete(params.id);
    if (!video) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Video deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to delete video' }, { status: 500 });
  }
}
