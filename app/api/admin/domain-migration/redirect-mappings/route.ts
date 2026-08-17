import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { RedirectMapping } from '@/app/models/RedirectMapping';
import { requirePermission } from '@/app/lib/adminAuth';

export async function GET(req: NextRequest) {
  const denied = await requirePermission('intelligence', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const batch = searchParams.get('batch');
    const status = searchParams.get('status');

    const query: Record<string, unknown> = {};
    if (batch) query.sitemapImportBatch = batch;
    if (status) query.status = status;

    const [rows, counts] = await Promise.all([
      (RedirectMapping as any).find(query).sort({ confidence: -1, oldUrl: 1 }).limit(1000).lean(),
      (RedirectMapping as any).aggregate([
        ...(batch ? [{ $match: { sitemapImportBatch: batch } }] : []),
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const statusCounts = Object.fromEntries(counts.map((c: any) => [c._id, c.count]));
    return NextResponse.json({ success: true, data: rows, statusCounts });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch redirect mappings' }, { status: 500 });
  }
}
