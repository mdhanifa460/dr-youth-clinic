import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { RedirectMapping, REDIRECT_MAPPING_STATUSES } from '@/app/models/RedirectMapping';
import { requirePermission, getAdminUser } from '@/app/lib/adminAuth';
import { getSiteUrlInventory } from '@/app/lib/siteUrlInventory';
import { isRealCurrentUrl } from '@/app/lib/domainMigration/matchUrl';

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

    // Approving is the one action that must never create a redirect chain
    // or a dangling redirect — enforced here, not just as a UI convention,
    // since this route is the only path that can set status: 'approved'.
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
      if (row.matchType === null) row.matchType = 'manual';
    }

    if (status) row.status = status as any;

    const user = await getAdminUser();
    row.reviewedBy = user?.email || user?.name || 'admin';
    row.reviewedAt = new Date();

    await row.save();
    return NextResponse.json({ success: true, data: row });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to update mapping' }, { status: 500 });
  }
}
