import { connectDB } from '@/app/lib/mongodb';
import { RedirectMapping } from '@/app/models/RedirectMapping';

// Shared "take a list of already-normalized old URLs, upsert them into a
// new import batch" step — used by both the sitemap-import route and the
// GSC-historical-URLs import route, so re-importing overlapping URLs from
// either source behaves identically (never duplicates a row, never
// clobbers a mapping an admin already reviewed for a URL that reappears in
// a later import).
export async function importOldUrlsToBatch(
  oldUrls: string[],
  batchPrefix: string
): Promise<{ batchId: string; imported: number; skippedExisting: number }> {
  await connectDB();
  const batchId = `${batchPrefix}_${Date.now()}`;

  let imported = 0;
  let skippedExisting = 0;
  for (const oldUrl of oldUrls) {
    const existing = await (RedirectMapping as any).findOne({ oldUrl }).select('_id').lean();
    if (existing) { skippedExisting++; continue; }
    await (RedirectMapping as any).create({ oldUrl, sitemapImportBatch: batchId, status: 'suggested' });
    imported++;
  }

  return { batchId, imported, skippedExisting };
}
