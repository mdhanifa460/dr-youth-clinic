import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { AiUsageLog } from '@/app/models/AiUsageLog';
import { requirePermission } from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  const denied = await requirePermission('ai', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const now = Date.now();
    const since24h = new Date(now - DAY_MS);
    const since7d = new Date(now - 7 * DAY_MS);
    const since30d = new Date(now - 30 * DAY_MS);

    const [byProvider30d, recentFailures, total24h, fail24h] = await Promise.all([
      (AiUsageLog as any).aggregate([
        { $match: { createdAt: { $gte: since30d } } },
        { $group: { _id: { provider: '$provider', success: '$success' }, count: { $sum: 1 } } },
      ]),
      (AiUsageLog as any)
        .find({ success: false })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('provider errorMessage createdAt')
        .lean(),
      (AiUsageLog as any).countDocuments({ createdAt: { $gte: since24h } }),
      (AiUsageLog as any).countDocuments({ createdAt: { $gte: since24h }, success: false }),
    ]);

    const empty = { total: 0, success: 0, failed: 0 };
    const byProvider: Record<string, typeof empty> = { anthropic: { ...empty }, gemini: { ...empty } };
    for (const row of byProvider30d) {
      const provider = row._id.provider as 'anthropic' | 'gemini';
      if (!byProvider[provider]) byProvider[provider] = { ...empty };
      byProvider[provider].total += row.count;
      if (row._id.success) byProvider[provider].success += row.count;
      else byProvider[provider].failed += row.count;
    }

    const dailyBreakdown = await (AiUsageLog as any).aggregate([
      { $match: { createdAt: { $gte: since7d } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          failed: { $sum: { $cond: ['$success', 0, 1] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        last24h: { total: total24h, failed: fail24h },
        last30dByProvider: byProvider,
        dailyBreakdown,
        recentFailures,
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to load AI usage' }, { status: 500 });
  }
}
