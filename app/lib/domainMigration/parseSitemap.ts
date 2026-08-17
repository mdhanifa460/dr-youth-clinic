// Old-site sitemap.xml → normalized, deduped URL list. Sitemap XML is
// simple, machine-generated, and (in this feature's flow) admin-supplied —
// a dependency-free regex extraction of <loc> values avoids adding a new
// XML-parsing dependency for what is a one-off, low-frequency admin action,
// rather than a hot runtime path.
//
// Handles both a plain <urlset> sitemap and a <sitemapindex> (a sitemap of
// sitemaps) by extracting every <loc> either way — a sitemap index's <loc>
// entries point at other sitemap XML files, not real pages, so the caller
// (the sitemap-import API route) is responsible for recursively fetching
// those if present; this function only ever extracts the <loc> values in
// whatever single XML document it's given.
export function extractLocsFromSitemapXml(xml: string): string[] {
  const matches = xml.match(/<loc>([^<]*)<\/loc>/gi) || [];
  return matches
    .map((m) => m.replace(/<\/?loc>/gi, '').trim())
    .map((url) => decodeXmlEntities(url))
    .filter(Boolean);
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// A sitemap index's <loc> entries end in .xml — used to tell "this is
// another sitemap to fetch" apart from "this is a real page URL" without
// needing to parse the outer <sitemapindex> vs <urlset> tag name (some
// old-site exports are malformed enough that tag-name detection is less
// reliable than just checking what the URL itself looks like).
export function looksLikeSitemapUrl(url: string): boolean {
  return /\.xml(\.gz)?(\?|$)/i.test(url);
}

// Old-site URLs → the normalized pathname this feature matches/stores by.
// Strips scheme+host+query+fragment, lowercases the path, collapses a
// trailing slash (except the root "/" itself) so "/About-Us/" and
// "/about-us" normalize identically. Never throws on a malformed URL —
// falls back to treating the raw input as already-a-path.
export function normalizeOldUrl(rawUrl: string): string {
  let path = rawUrl.trim();
  try {
    const u = new URL(rawUrl);
    path = u.pathname;
  } catch {
    // Not a full URL (e.g. already just "/about-us") — use as-is, still
    // strip any query/fragment below.
    path = path.split('?')[0].split('#')[0];
  }
  path = path.toLowerCase();
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  if (!path.startsWith('/')) path = `/${path}`;
  return path;
}

// Extracts, normalizes, and dedupes every real-page URL from one or more
// sitemap XML documents. `xmlDocs` may include sitemap-index children
// already fetched by the caller — this function is agnostic to how many
// documents contributed URLs, it just merges and dedupes the result.
export function parseSitemapUrls(xmlDocs: string[]): string[] {
  const seen = new Set<string>();
  for (const xml of xmlDocs) {
    for (const loc of extractLocsFromSitemapXml(xml)) {
      if (looksLikeSitemapUrl(loc)) continue; // caller handles index children separately
      seen.add(normalizeOldUrl(loc));
    }
  }
  return Array.from(seen).sort();
}
