import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { Video } from '@/app/models/Video';
// Registers Doctor/Service with Mongoose for the .populate() calls below —
// see app/api/admin/results/route.ts for why this import can't be dropped.
import '@/app/models/Doctor';
import '@/app/models/Service';
import { requirePermission } from '@/app/lib/adminAuth';

export async function GET(req: NextRequest) {
  const denied = await requirePermission('videos', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const query: Record<string, any> = {};
    if (category) query.category = category;

    const videos = await (Video as any)
      .find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .populate('doctor', 'name photo')
      .populate('service', 'name urlSlug')
      .lean();

    return NextResponse.json({ success: true, data: videos });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch videos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission('videos', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const video = await Video.create(body);
    revalidateTag('videos');
    return NextResponse.json({ success: true, data: video, message: 'Video created successfully' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to create video' }, { status: 500 });
  }
}
