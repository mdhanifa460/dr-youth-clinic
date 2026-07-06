import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Offer } from '@/app/models/Offer';
import { requirePermission } from '@/app/lib/adminAuth';
import { revalidateTag } from 'next/cache';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('offers', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const offer = await (Offer as any).findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
    if (!offer) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    revalidateTag('offers');
    return NextResponse.json({ success: true, data: offer });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to update offer' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('offers', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const offer = await (Offer as any).findByIdAndDelete(params.id);
    if (!offer) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    revalidateTag('offers');
    return NextResponse.json({ success: true, message: 'Offer deleted' });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to delete offer' }, { status: 500 });
  }
}
