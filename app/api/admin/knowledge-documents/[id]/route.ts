import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { KnowledgeDocument } from '@/app/models/KnowledgeDocument';
import { requirePermission } from '@/app/lib/adminAuth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('ai', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const doc = await (KnowledgeDocument as any).findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
    if (!doc) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: doc });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to update document' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('ai', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const doc = await (KnowledgeDocument as any).findByIdAndDelete(params.id);
    if (!doc) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Document deleted' });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to delete document' }, { status: 500 });
  }
}
