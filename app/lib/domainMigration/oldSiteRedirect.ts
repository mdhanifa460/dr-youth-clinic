// Server-side permanent redirects for the OLD domain (dryouthclinic.co.in).
//
// Once the old domain's DNS points at this Vercel project, middleware.ts
// sends every request for it to app/api/domain-migration/old-site, which
// answers with ONE 308 straight to the right page on the new domain:
//   - an approved Domain Migration mapping for that path (admin-controlled), or
//   - an old homepage file (default.aspx, index.html, ...) -> "/", or
//   - otherwise the same path on the new domain.
// That replaces the earlier "404 first, then a browser-side jump" path,
// which Google reads as a 404 for the old URL.
//
// Edge-safe (no Node-only imports): middleware.ts imports this file too.

// Keep in sync with the host matcher in middleware.ts `config.matcher`
// (Next requires that matcher to be a literal, so it can't import this).
export const OLD_SITE_HOSTNAMES = ['dryouthclinic.co.in', 'www.dryouthclinic.co.in'];

export const OLD_SITE_RESOLVER_PATH = '/api/domain-migration/old-site';
// Request header middleware.ts uses to hand the original path + query to
// the resolver route.
export const OLD_SITE_PATH_HEADER = 'x-old-site-path';

// Host header may carry a port; compare the bare, lower-cased hostname.
export function oldSiteHostname(hostHeader: string | null | undefined): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.trim().toLowerCase().replace(/:\d+$/, '');
  return OLD_SITE_HOSTNAMES.includes(host) ? host : null;
}

const OLD_HOME_FILE = /^\/(?:default|index|home)\.(?:aspx?|html?|php)$/i;

// Builds the absolute redirect target on the canonical site. Never lets the
// old path or a mapping point anywhere except the canonical origin: the
// path is assigned to URL.pathname (so "//evil.example" stays a path), and
// an absolute mapping on another host is ignored.
export function buildOldSiteTarget(opts: {
  canonicalSiteUrl: string;
  oldPathWithQuery: string;
  mappedNewUrl: string | null;
  oldHost: string;
}): string {
  const canonical = new URL(opts.canonicalSiteUrl);
  const raw = opts.oldPathWithQuery || '/';
  const qIndex = raw.indexOf('?');
  const oldPath = (qIndex === -1 ? raw : raw.slice(0, qIndex)).split('#')[0] || '/';
  const oldQuery = new URLSearchParams(qIndex === -1 ? '' : raw.slice(qIndex + 1));

  const target = new URL(canonical.origin);
  let usedMapping = false;
  if (opts.mappedNewUrl) {
    try {
      const mapped = new URL(opts.mappedNewUrl, canonical.origin);
      if (mapped.host === canonical.host) {
        target.pathname = mapped.pathname;
        target.search = mapped.search;
        usedMapping = true;
      }
    } catch {
      // Malformed mapping: fall through to the same-path fallback.
    }
  }

  if (!usedMapping) {
    target.pathname = OLD_HOME_FILE.test(oldPath) ? '/' : oldPath.startsWith('/') ? oldPath : `/${oldPath}`;
    // Same-path fallback keeps the old query string as it was.
    oldQuery.forEach((v, k) => target.searchParams.append(k, v));
  } else {
    // A mapped page keeps only campaign/click attribution from the old URL;
    // old-site query params (?id=12) mean nothing on the new site.
    oldQuery.forEach((v, k) => {
      if (/^utm_/i.test(k) || ['gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid'].includes(k.toLowerCase())) {
        target.searchParams.append(k, v);
      }
    });
  }

  // Existing old-domain attribution convention (app/lib/migrationAttribution.ts).
  target.searchParams.set('migration_source', 'old_domain');
  target.searchParams.set('migration_from', opts.oldHost.replace(/^www\./, ''));
  return target.toString();
}
