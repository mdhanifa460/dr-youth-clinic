import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { RedirectMapping, REDIRECT_MAPPING_STATUSES } from '@/app/models/RedirectMapping';
import { requirePermission, getAdminUser } from '@/app/lib/adminAuth';
import { getSiteUrlInventory } from '@/app/lib/siteUrlInventory';
import { isRealCurrentUrl } from '@/app/lib/domainMigration/matchUrl';
import { setCachedRedirect, deleteCachedRedirect } from '@/app/lib/domainMigration/redirectCache';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('intelligence', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const { status, newUrl } = body as { status?: string; newUrl?: string };

    if (status && !REDIRECT_MAPPING_STATUSES.includes(status as any)) {
      return NextResponse.json({ success: false, message: `Invalid status "${status}".` }, { status: 400 });
    }

    const row = await (RedirectMapping as any).findById(params.id);
    if (!row) return NextResponse.json({ success: false, message: 'Mapping not found' }, { status: 404 });

    // A manual newUrl edit (an admin correcting a wrong/weak suggestion)
    // is allowed at any status, always re-validated below.
    if (typeof newUrl === 'string') row.newUrl = newUrl.trim();

    // Approving is the one action that must never create a redirect chain,
    // a dangling redirect, or — the one this guard exists for after a real
    // incident — a self-redirect on a path the site itself still serves.
    // Enforced here, not just as a UI convention, since this route is the
    // only path that can set status: 'approved'.
    if (status === 'approved') {
      if (!row.newUrl) {
        return NextResponse.json({ success: false, message: 'Cannot approve a mapping with no target URL — set one first.' }, { status: 400 });
      }
      const inventory = await getSiteUrlInventory();
      if (!isRealCurrentUrl(row.newUrl, inventory)) {
        return NextResponse.json(
          { success: false, message: `"${row.newUrl}" is not a real, current page on this site — cannot approve (this would create a dangling redirect or a chain to another old URL).` },
          { status: 400 }
        );
      }
      // The redirect-serving layer (middleware.ts) matches purely on path,
      // with no way to tell "this request arrived via the old domain's
      // forward" apart from "this is a native visit to a page the site
      // already serves at this exact path" — they're indistinguishable.
      // Approving a mapping whose oldUrl collides with a real current page
      // would hijack that page's own live traffic (at best, redirect it
      // elsewhere; at worst — confirmed in production — a real
      // self-redirect loop when oldUrl and newUrl are the same path,
      // e.g. the site root).
      if (isRealCurrentUrl(row.oldUrl, inventory)) {
        return NextResponse.json(
          { success: false, message: `"${row.oldUrl}" is itself a real, current page on this site — approving this would redirect that page's own live traffic away from it. This mapping should stay unapproved; that path already works correctly without any redirect.` },
          { status: 400 }
        );
      }
      if (row.matchType === null) row.matchType = 'manual';
    }

    const previousStatus = row.status;
    if (status) row.status = status as any;

    const user = await getAdminUser();
    row.reviewedBy = user?.email || user?.name || 'admin';
    row.reviewedAt = new Date();

    await row.save();

    // Keep the Redis mirror (middleware.ts's redirectCache.ts) in sync
    // immediately — this is what actually makes an approval take live
    // effect for a real visitor, not just the unstable_cache tag below.
    if (row.status === 'approved' && row.newUrl) {
      await setCachedRedirect(row.oldUrl, row.newUrl);
    } else if (previousStatus === 'approved' && row.status !== 'approved') {
      await deleteCachedRedirect(row.oldUrl);
    }

    // Approving/rejecting is exactly what app/lib/domainMigration/
    // serveRedirect.ts's cached lookup is keyed on — bust it immediately
    // so an approval takes effect within seconds, not the full 5-minute
    // cache window.
    if (status) revalidateTag('redirect-mappings');
    return NextResponse.json({ success: true, data: row });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to update mapping' }, { status: 500 });
  }
}
