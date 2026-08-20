import { unstable_cache } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { RedirectMapping } from '@/app/models/RedirectMapping';

// Phase 3 — the only place an approved RedirectMapping actually takes
// effect for a real visitor. Deliberately called from app/not-found.tsx,
// not middleware: middleware runs on every request to the entire public
// site (Edge runtime, no direct DB access, and it's also the file that
// gates admin auth — touching it for this carries real blast-radius risk).
// This lookup only ever runs for a request that would already be a
// dead-end 404, so every real, valid page on the site is completely
// unaffected by this feature's existence.
//
// Cached 5 minutes (same revalidate window most of this app's read paths
// use) and tagged 'redirect-mappings' — the admin approve/reject/bulk-
// approve routes call revalidateTag('redirect-mappings') so an approval
// takes effect within this window without needing a redeploy, matching
// every other admin-configurable feature in this app.
const getApprovedMappingCached = unstable_cache(
  async (oldUrl: string): Promise<string | null> => {
    await connectDB();
    const mapping = await (RedirectMapping as any)
      .findOne({ oldUrl, status: 'approved' })
      .select('newUrl')
      .lean();
    return mapping?.newUrl || null;
  },
  ['approved-redirect-mapping'],
  { revalidate: 300, tags: ['redirect-mappings'] }
);

// Never throws — a lookup failure must never turn an ordinary 404 into a
// crashed page. Returns null on any error, same as "no mapping found".
export async function getApprovedRedirect(oldUrl: string): Promise<string | null> {
  try {
    return await getApprovedMappingCached(oldUrl);
  } catch {
    return null;
  }
}
