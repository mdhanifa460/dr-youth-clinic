import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { getSettings } from '@/app/models/Settings';
import { requirePermission } from '@/app/lib/adminAuth';
import { getGscTopPages } from '@/app/lib/googleSearchConsole';
import { normalizeOldUrl } from '@/app/lib/domainMigration/parseSitemap';
import { importOldUrlsToBatch } from '@/app/lib/domainMigration/importOldUrls';

// Second old-URL-inventory source, alongside sitemap-import — pulls the
// old domain's own crawl/traffic history from Search Console (already
// configured for the Domain Migration dashboard; reuses that same
// oldDomainGscSiteUrl setting, no new config needed). Surfaces pages that
// got real impressions/clicks even if a stale or incomplete old sitemap
// missed them. Same batch/upsert mechanism as sitemap-import, so importing
// from both sources never creates duplicate rows.
const LOOKBACK_DAYS = 480; // ~16 months — GSC's own maximum retention window
const ROW_LIMIT = 500;

export async function POST() {
  const denied = await requirePermission('intelligence', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const settings = await getSettings();
    const siteUrl = settings.domainMigration?.oldDomainGscSiteUrl || '';
    if (!siteUrl) {
      return NextResponse.json(
        { success: false, message: 'No old-domain Search Console site URL configured — set one in Settings → Analytics → Domain Migration first.' },
        { status: 400 }
      );
    }

    const pages = await getGscTopPages(siteUrl, LOOKBACK_DAYS, ROW_LIMIT);
    if (pages.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Search Console returned no pages for the old domain — check the site URL is verified and the service account has access.' },
        { status: 400 }
      );
    }

    const oldUrls = Array.from(new Set(pages.map((p) => normalizeOldUrl(p.page))));
    const { batchId, imported, skippedExisting } = await importOldUrlsToBatch(oldUrls, 'gsc');

    return NextResponse.json({
      success: true,
      data: { batchId, totalUrlsFound: oldUrls.length, imported, skippedExisting },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to import from Search Console' }, { status: 500 });
  }
}
