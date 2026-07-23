import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { StoryType } from '@/app/models/StoryType';
import { requirePermission } from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requirePermission('stories', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const types = await (StoryType as any).find({}).sort({ order: 1, createdAt: 1 }).lean();
    return NextResponse.json({ success: true, data: types });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch story types' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission('stories', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const type = await StoryType.create(body);
    return NextResponse.json({ success: true, data: type }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to create story type' }, { status: 500 });
  }
}
