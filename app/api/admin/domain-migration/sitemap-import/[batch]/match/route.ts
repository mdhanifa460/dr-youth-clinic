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

    // `force=true` re-evaluates every row that hasn't been human-approved
    // yet in this batch (both 'suggested' and 'no_match'), regardless of
    // whether it already has a matchType — for re-running the matcher
    // after a real improvement to it (e.g. a new city/category keyword,
    // a noise-token fix) without having to touch the database directly.
    // Approved rows are never touched by this route at all, forced or not
    // — only PATCH/bulk-approve ever change an approved row.
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';

    const rows = await (RedirectMapping as any).find(
      force
        ? { sitemapImportBatch: params.batch, status: { $in: ['suggested', 'no_match'] } }
        : { sitemapImportBatch: params.batch, status: 'suggested', matchType: null }
    );

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
        // Explicit, not just "already the default" — a forced re-match can
        // process a row that's currently 'no_match' and now scores above
        // the floor; without this it would stay stuck as 'no_match'
        // despite having a good new suggestion.
        row.status = 'suggested';
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
