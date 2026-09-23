import { NextRequest, NextResponse } from 'next/server';
import { normalizeOldUrl } from '@/app/lib/domainMigration/parseSitemap';
import { getApprovedRedirect } from '@/app/lib/domainMigration/serveRedirect';

// Called client-side by app/not-found.tsx (see that file's comment for why
// this moved out of a headers()-reading server component: this exact
// lookup, done via headers() in the global not-found boundary, was
// confirmed to force EVERY page on the site into full per-request dynamic
// rendering — the not-found boundary is bundled into every other page's own
// static-generation attempt, so a dynamic API call here ran during THEIR
// render too). A tiny client fetch has none of that blast radius: it only
// ever runs after a real 404 has already rendered, using window.location.
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path') || '';
  const redirectUrl = path ? await getApprovedRedirect(normalizeOldUrl(path)) : null;
  return NextResponse.json({ redirectUrl });
}
