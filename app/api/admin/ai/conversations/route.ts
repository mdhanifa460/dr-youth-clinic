import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Conversation } from '@/app/models/Conversation';
import { requirePermission } from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requirePermission('ai', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    // List view only needs the first/last message + counts, not the full
    // thread — keeps the admin list fast even as conversations accumulate.
    const conversations = await (Conversation as any)
      .find({})
      .select('sessionId location handedOffToWhatsApp startedAt lastMessageAt messages')
      .sort({ lastMessageAt: -1 })
      .limit(100)
      .lean();

    const summarized = conversations.map((c: any) => ({
      _id: c._id,
      sessionId: c.sessionId,
      location: c.location,
      handedOffToWhatsApp: c.handedOffToWhatsApp,
      startedAt: c.startedAt,
      lastMessageAt: c.lastMessageAt,
      messageCount: c.messages?.length ?? 0,
      firstUserMessage: c.messages?.find((m: any) => m.role === 'user')?.content ?? '',
    }));

    return NextResponse.json({ success: true, data: summarized });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch conversations' }, { status: 500 });
  }
}
