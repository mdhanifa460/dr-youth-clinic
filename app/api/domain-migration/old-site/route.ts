import { NextRequest, NextResponse } from 'next/server';
import { normalizeOldUrl } from '@/app/lib/domainMigration/parseSitemap';
import { getApprovedRedirect } from '@/app/lib/domainMigration/serveRedirect';
import { buildOldSiteTarget, oldSiteHostname, OLD_SITE_PATH_HEADER } from '@/app/lib/domainMigration/oldSiteRedirect';

// Reached only through middleware.ts's rewrite for requests on the OLD
// domain (see app/lib/domainMigration/oldSiteRedirect.ts). Answers every one
// with a single permanent redirect to the new domain. The approved mapping
// comes straight from MongoDB (5-minute cache, cleared by the admin
// approve/reject routes), so it works whether or not the Redis mirror used
// by middleware for the new domain is configured.
//
// The Host header must be the old domain, so calling this route on the new
// domain just 404s. The path header is client-settable, but it can only
// change which path on the canonical site the redirect points to.
export const dynamic = 'force-dynamic';

const CANONICAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://dryouthclinics.com';

async function handle(req: NextRequest) {
  const oldHost = oldSiteHostname(req.headers.get('host'));
  if (!oldHost) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const oldPathWithQuery = req.headers.get(OLD_SITE_PATH_HEADER) || '/';
  const mapped = await getApprovedRedirect(normalizeOldUrl(oldPathWithQuery));
  const target = buildOldSiteTarget({
    canonicalSiteUrl: CANONICAL_SITE_URL,
    oldPathWithQuery,
    mappedNewUrl: mapped,
    oldHost,
  });
  return NextResponse.redirect(target, 308);
}

export const GET = handle;
export const HEAD = handle;
