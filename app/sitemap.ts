import { MetadataRoute } from 'next';
import { getSiteUrlInventory, staticRoutes, type SiteUrlEntry } from '@/app/lib/siteUrlInventory';

export const dynamic = 'force-dynamic';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
if (!SITE_URL) {
  console.error('[sitemap] NEXT_PUBLIC_SITE_URL is not set — sitemap URLs will be relative and ignored by Google. Set this env var in Vercel dashboard.');
}

function toSitemapEntry(e: SiteUrlEntry): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE_URL}${e.path}`,
    lastModified: e.lastModified,
    changeFrequency: e.changeFrequency,
    priority: e.priority,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const entries = await getSiteUrlInventory();
    return entries.map(toSitemapEntry);
  } catch {
    // staticRoutes() is pure/synchronous — safe to call here even though
    // the DB-querying half of getSiteUrlInventory() just failed above.
    return staticRoutes().map(toSitemapEntry);
  }
}
