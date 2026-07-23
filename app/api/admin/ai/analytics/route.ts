import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Conversation } from '@/app/models/Conversation';
import { requirePermission } from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';

// Every number here is computed from real Conversation documents — no
// simulated/hardcoded rows (unlike a couple of the existing Intelligence
// dashboard panels, which are explicitly rule-based mockups).
export async function GET() {
  const denied = await requirePermission('ai', 'view');
  if (denied) return denied;

  try {
    await connectDB();

    const [totals, dailyVolume, cardTypeBreakdown, recentQuestions] = await Promise.all([
      (Conversation as any).aggregate([
        {
          $project: {
            messageCount: { $size: '$messages' },
            handedOffToWhatsApp: 1,
          },
        },
        {
          $group: {
            _id: null,
            totalConversations: { $sum: 1 },
            totalMessages: { $sum: '$messageCount' },
            whatsappHandoffs: { $sum: { $cond: ['$handedOffToWhatsApp', 1, 0] } },
          },
        },
      ]),
      (Conversation as any).aggregate([
        { $unwind: '$messages' },
        {
          $match: { 'messages.createdAt': { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$messages.createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      (Conversation as any).aggregate([
        { $unwind: '$messages' },
        { $unwind: { path: '$messages.cards', preserveNullAndEmptyArrays: false } },
        { $group: { _id: '$messages.cards.type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      (Conversation as any).aggregate([
        { $unwind: '$messages' },
        { $match: { 'messages.role': 'user' } },
        { $sort: { 'messages.createdAt': -1 } },
        { $limit: 15 },
        { $project: { question: '$messages.content', askedAt: '$messages.createdAt' } },
      ]),
    ]);

    const t = totals[0] || { totalConversations: 0, totalMessages: 0, whatsappHandoffs: 0 };

    return NextResponse.json({
      success: true,
      data: {
        totalConversations: t.totalConversations,
        totalMessages: t.totalMessages,
        whatsappHandoffs: t.whatsappHandoffs,
        avgMessagesPerConversation: t.totalConversations > 0 ? Math.round((t.totalMessages / t.totalConversations) * 10) / 10 : 0,
        dailyVolume,
        cardTypeBreakdown,
        recentQuestions,
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to compute analytics' }, { status: 500 });
  }
}
