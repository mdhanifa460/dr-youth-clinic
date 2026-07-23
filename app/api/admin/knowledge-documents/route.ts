import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { KnowledgeDocument } from '@/app/models/KnowledgeDocument';
import { requirePermission } from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requirePermission('ai', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const docs = await (KnowledgeDocument as any).find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: docs });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission('ai', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const doc = await KnowledgeDocument.create(body);
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to create document' }, { status: 500 });
  }
}
