import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Achievement } from '@/app/models/Achievement';
import { requirePermission } from '@/app/lib/adminAuth';
import { revalidateTag } from 'next/cache';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('achievements', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const achievement = await (Achievement as any).findByIdAndUpdate(params.id, body, { returnDocument: 'after', runValidators: true });
    if (!achievement) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    revalidateTag('achievements');
    return NextResponse.json({ success: true, data: achievement });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to update achievement' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('achievements', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const achievement = await (Achievement as any).findByIdAndDelete(params.id);
    if (!achievement) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    revalidateTag('achievements');
    return NextResponse.json({ success: true, message: 'Achievement deleted' });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to delete achievement' }, { status: 500 });
  }
}
