import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';
import { fetchBusinessLocations, saveBusinessLocations, GbpError } from '@/app/lib/reviews/businessProfileSync';
import { BRANCHES, type BusinessLocationLink } from '@/app/lib/reviews/businessProfileReviews';

export const dynamic = 'force-dynamic';

// GET: the listings the connected Google account manages, with the saved
// (or suggested) branch for each. Nothing is saved until the admin saves.
export async function GET() {
  const denied = await requirePermission('reviews', 'full');
  if (denied) return denied;
  try {
    return NextResponse.json({ success: true, locations: await fetchBusinessLocations() });
  } catch (err) {
    if (!(err instanceof GbpError)) console.error('[google-business] locations failed:', err instanceof Error ? err.message : err);
    const message = err instanceof GbpError ? err.message : 'Could not load the listings from Google.';
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}

// PUT: save the branch matching. Each branch may be matched to one listing only.
export async function PUT(req: NextRequest) {
  const denied = await requirePermission('reviews', 'full');
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const links: BusinessLocationLink[] = Array.isArray(body?.locations) ? body.locations : [];
  const valid = links.length <= 50 && links.every((l) =>
    typeof l?.account === 'string' && /^accounts\/[\w-]+$/.test(l.account) &&
    typeof l?.location === 'string' && /^locations\/[\w-]+$/.test(l.location) &&
    (l.branch === '' || (BRANCHES as readonly string[]).includes(l.branch)));
  if (!valid) return NextResponse.json({ success: false, message: 'Invalid listing or branch.' }, { status: 400 });
  const used = links.map((l) => l.branch).filter(Boolean);
  if (new Set(used).size !== used.length) {
    return NextResponse.json({ success: false, message: 'Each branch can be matched to only one Google listing.' }, { status: 400 });
  }
  await saveBusinessLocations(links);
  return NextResponse.json({ success: true });
}
