import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Conversation } from '@/app/models/Conversation';
import { requirePermission } from '@/app/lib/adminAuth';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('ai', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const conversation = await (Conversation as any).findById(params.id).lean();
    if (!conversation) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: conversation });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch conversation' }, { status: 500 });
  }
}
