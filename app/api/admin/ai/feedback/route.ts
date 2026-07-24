import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Conversation } from '@/app/models/Conversation';
import { requirePermission } from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';

// Flat list of every rated assistant reply (both thumbs up and down),
// newest first — the aggregate up/down counts live in /api/admin/ai/analytics;
// this route exists so the Feedback tab can show the actual message text,
// which is what makes a 👎 actionable rather than just a number.
export async function GET() {
  const denied = await requirePermission('ai', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const rows = await (Conversation as any).aggregate([
      { $unwind: '$messages' },
      { $match: { 'messages.feedback': { $in: ['up', 'down'] } } },
      { $sort: { 'messages.createdAt': -1 } },
      { $limit: 100 },
      {
        $project: {
          _id: 0,
          sessionId: 1,
          feedback: '$messages.feedback',
          content: '$messages.content',
          createdAt: '$messages.createdAt',
        },
      },
    ]);
    return NextResponse.json({ success: true, data: rows });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch feedback' }, { status: 500 });
  }
}
