import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { RedirectMapping } from '@/app/models/RedirectMapping';
import { requirePermission, getAdminUser } from '@/app/lib/adminAuth';
import { getSiteUrlInventory } from '@/app/lib/siteUrlInventory';
import { isRealCurrentUrl } from '@/app/lib/domainMigration/matchUrl';

// Approves every 'suggested' row in a batch at/above minConfidence in one
// action — for a real migration with hundreds of old URLs, reviewing every
// exact/high-confidence match one at a time isn't realistic. Still runs
// each row through the exact same isRealCurrentUrl() guard as a single
// approve, so this can't be used to bulk-approve a broken mapping any more
// than the single-row route can.
export async function POST(req: NextRequest) {
  const denied = await requirePermission('intelligence', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const { batch, minConfidence } = body as { batch?: string; minConfidence?: number };
    if (!batch) return NextResponse.json({ success: false, message: 'batch is required' }, { status: 400 });

    const floor = typeof minConfidence === 'number' ? minConfidence : 80;
    const inventory = await getSiteUrlInventory();
    const user = await getAdminUser();

    const candidates = await (RedirectMapping as any).find({
      sitemapImportBatch: batch,
      status: 'suggested',
      confidence: { $gte: floor },
    });

    let approved = 0;
    let skippedInvalid = 0;
    for (const row of candidates) {
      if (!row.newUrl || !isRealCurrentUrl(row.newUrl, inventory)) { skippedInvalid++; continue; }
      row.status = 'approved';
      row.reviewedBy = user?.email || user?.name || 'admin';
      row.reviewedAt = new Date();
      await row.save();
      approved++;
    }

    if (approved > 0) revalidateTag('redirect-mappings');
    return NextResponse.json({ success: true, data: { batch, floor, candidates: candidates.length, approved, skippedInvalid } });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to bulk-approve mappings' }, { status: 500 });
  }
}
