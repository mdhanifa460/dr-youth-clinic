import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { RedirectMapping } from '@/app/models/RedirectMapping';
import { requirePermission } from '@/app/lib/adminAuth';
import { getSiteUrlInventory } from '@/app/lib/siteUrlInventory';
import { matchUrlDeterministic } from '@/app/lib/domainMigration/matchUrl';

// Below this, a candidate is still shown to the admin (so they can see
// what the closest guess was and manually correct it) but is never
// presented as a ready-to-approve suggestion — status becomes 'no_match'
// rather than 'suggested'. Matches the plan's explicit "never auto-map a
// weak guess" rule; Phase 2's AI fallback is meant to pick these rows up.
const CONFIDENCE_FLOOR = 40;

export async function POST(req: NextRequest, { params }: { params: { batch: string } }) {
  const denied = await requirePermission('intelligence', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const inventory = await getSiteUrlInventory();

    const rows = await (RedirectMapping as any).find({
      sitemapImportBatch: params.batch,
      status: 'suggested',
      matchType: null,
    });

    let matched = 0;
    let noMatch = 0;
    for (const row of rows) {
      const result = matchUrlDeterministic(row.oldUrl, inventory);
      row.newUrl = result.newUrl;
      row.matchType = result.matchType;
      row.confidence = result.confidence;
      row.confidenceLevel = result.confidenceLevel;
      row.reasoning = result.reasoning;
      if (result.confidence < CONFIDENCE_FLOOR) {
        row.status = 'no_match';
        noMatch++;
      } else {
        matched++;
      }
      await row.save();
    }

    return NextResponse.json({
      success: true,
      data: { batch: params.batch, processed: rows.length, matched, noMatch },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to run matching' }, { status: 500 });
  }
}
