import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Conversation } from '@/app/models/Conversation';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Fired when a visitor taps thumbs up/down on an assistant reply — addressed
// by {sessionId, createdAt} (echoed to the client in the 'meta' ndjson event
// right after that message was persisted) rather than an array index, since
// the 60-message trim in /api/ai-chat can shift indices.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`ai-chat-feedback:${ip}`, 60, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    const { sessionId, createdAt, feedback } = await req.json();
    if (!sessionId || !createdAt || !['up', 'down'].includes(feedback)) {
      return NextResponse.json({ success: false, message: 'sessionId, createdAt, and feedback (up|down) are required' }, { status: 400 });
    }

    await connectDB();
    const result = await (Conversation as any).updateOne(
      { sessionId, 'messages.createdAt': new Date(createdAt) },
      { $set: { 'messages.$.feedback': feedback } }
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, message: 'Message not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
