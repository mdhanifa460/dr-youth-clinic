import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Faq } from '@/app/models/Faq';
import { requirePermission } from '@/app/lib/adminAuth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('faqs', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    if (!body.doctor) body.doctor = null;
    if (!body.service) body.service = null;
    const faq = await (Faq as any).findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
    if (!faq) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: faq });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to update FAQ' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('faqs', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const faq = await (Faq as any).findByIdAndDelete(params.id);
    if (!faq) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'FAQ deleted' });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to delete FAQ' }, { status: 500 });
  }
}
