import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { KnowledgeChunk } from '@/app/models/KnowledgeChunk';
import { requirePermission } from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';

// Read-only browser over the derived KnowledgeChunk collection — chunks are
// never authored directly here, they're a side effect of Service/Doctor/
// Blog/Location/Result/Offer/KnowledgeDocument saves (see syncKnowledgeChunk
// hooks on each model). Excludes the `embedding` array from the response —
// it's a 3072-float vector with no admin-facing value, just payload weight.
export async function GET(req: NextRequest) {
  const denied = await requirePermission('ai', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const sourceType = searchParams.get('sourceType');
    const query: any = {};
    if (sourceType) query.sourceType = sourceType;

    const [chunks, counts] = await Promise.all([
      (KnowledgeChunk as any).find(query).select('-embedding').sort({ updatedAt: -1 }).limit(200).lean(),
      (KnowledgeChunk as any).aggregate([{ $group: { _id: '$sourceType', count: { $sum: 1 } } }]),
    ]);

    return NextResponse.json({
      success: true,
      data: chunks,
      counts: Object.fromEntries(counts.map((c: any) => [c._id, c.count])),
    });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch knowledge base' }, { status: 500 });
  }
}
