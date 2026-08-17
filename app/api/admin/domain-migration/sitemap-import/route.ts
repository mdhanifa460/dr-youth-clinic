import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';
import { extractLocsFromSitemapXml, looksLikeSitemapUrl, parseSitemapUrls } from '@/app/lib/domainMigration/parseSitemap';
import { importOldUrlsToBatch } from '@/app/lib/domainMigration/importOldUrls';

// Admin-only, low-frequency (a real migration happens once), so the
// straightforward safety caps below matter more for "don't let a huge or
// malformed sitemap hang this request" than for defending against abuse —
// this route is already behind requirePermission, not public.
const MAX_CHILD_SITEMAPS = 50;
const MAX_URLS = 5000;

async function fetchXml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': 'DrYouthClinic-DomainMigration/1.0' } });
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);
  return res.text();
}

// Resolves a top-level sitemap into the flat list of real-page XML
// documents it ultimately points at — recursing exactly one level into a
// sitemap index (a sitemap of sitemaps), which is how large sites like a
// migrated Wix/CMS export are commonly structured. A plain <urlset> (no
// child sitemaps) returns itself unchanged.
async function resolveSitemapDocs(rootXml: string): Promise<string[]> {
  const locs = extractLocsFromSitemapXml(rootXml);
  const childSitemapUrls = locs.filter(looksLikeSitemapUrl).slice(0, MAX_CHILD_SITEMAPS);
  if (childSitemapUrls.length === 0) return [rootXml];

  const children = await Promise.allSettled(childSitemapUrls.map(fetchXml));
  const docs = children.filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled').map((r) => r.value);
  // Include the root doc too in case it mixes index entries with real page
  // <loc>s (malformed but seen in the wild) — parseSitemapUrls already
  // filters out anything that still looks like a sitemap URL.
  return [rootXml, ...docs];
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission('intelligence', 'full');
  if (denied) return denied;

  try {
    const body = await req.json();
    const { xml, url } = body as { xml?: string; url?: string };

    if (!xml && !url) {
      return NextResponse.json({ success: false, message: 'Provide either the sitemap XML content or a URL to fetch it from.' }, { status: 400 });
    }

    let rootXml: string;
    try {
      rootXml = xml || (await fetchXml(url as string));
    } catch (e: any) {
      return NextResponse.json({ success: false, message: `Could not fetch the sitemap: ${e.message || 'unknown error'}` }, { status: 400 });
    }

    const docs = await resolveSitemapDocs(rootXml);
    let oldUrls = parseSitemapUrls(docs);

    if (oldUrls.length === 0) {
      return NextResponse.json({ success: false, message: 'No page URLs found in this sitemap — check the file/URL is correct.' }, { status: 400 });
    }
    if (oldUrls.length > MAX_URLS) oldUrls = oldUrls.slice(0, MAX_URLS);

    const { batchId, imported, skippedExisting } = await importOldUrlsToBatch(oldUrls, 'imp');

    return NextResponse.json({
      success: true,
      data: { batchId, totalUrlsFound: oldUrls.length, imported, skippedExisting },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to import sitemap' }, { status: 500 });
  }
}
