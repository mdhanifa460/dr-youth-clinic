import type { SiteUrlEntry } from '@/app/lib/siteUrlInventory';
import { deriveConfidenceLevel } from '@/app/lib/confidenceLevel';

// Deterministic (rules-based, no AI call) old→new URL matching. Runs first
// for every imported old URL — only rows that stay below the confidence
// floor after this pass are candidates for the AI fallback (Phase 2, not
// built yet). Never guesses an unmatched URL onto "/" — an old path with
// no real overlap against the current site's inventory returns
// `newUrl: null` here, same as a genuinely empty search.
export interface MatchCandidate {
  newUrl: string | null;
  matchType: 'exact' | 'rule' | null;
  confidence: number; // 0-100
  confidenceLevel: 'High' | 'Medium' | 'Low' | null;
  reasoning: string;
}

// Old CMS/URL-builder cruft that never appears in this site's own routes —
// stripped before comparing, not before storing (RedirectMapping.oldUrl
// keeps the real normalized old path, unmodified).
const KNOWN_SUFFIXES = /\.(aspx|html?|php)$/i;

// Broad, deliberately old-site-vocabulary keyword → current Service
// category mapping, matching the three real categories in
// app/lib/siteUrlInventory.ts (SERVICE_CATEGORIES / the Service model's
// enum lowercased). Restricting the match pool to a detected category
// avoids comparing an old hair-related URL against unrelated skin/laser
// pages, which is where a naive whole-site token match tends to misfire.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  hair: ['hair', 'transplant', 'baldness', 'scalp', 'alopecia', 'prp', 'gfc', 'dandruff'],
  skin: ['skin', 'acne', 'scar', 'peel', 'pigmentation', 'facial', 'glow', 'wrinkle', 'antiaging', 'aging', 'tan', 'melasma', 'vitiligo', 'whitening'],
  laser: ['laser', 'reduction', 'tattoo', 'resurfacing', 'co2'],
};

// The site's 4 real cities, plus the old site's Bangalore-neighborhood
// vocabulary (its old SEO strategy was one page per neighborhood —
// Kammanahalli, Hebbal, Banaswadi, ... — none of which exist as their own
// city on the new site). Detecting these as "this old URL is about
// Bangalore" is what lets the pool-filtering below prefer Bangalore's own
// pages over some other city's, instead of picking whichever city's page
// happened to share the most unrelated tokens.
const CITY_KEYWORDS: Record<string, string[]> = {
  chennai: ['chennai'],
  bangalore: [
    'bangalore', 'bengaluru', 'kammanahalli', 'hebbal', 'banaswadi', 'nagawara', 'nagwara',
    'kalyan', 'hrbr', 'hbr', 'hennur', 'kasturi', 'ramamurthy',
  ],
  kochi: ['kochi', 'cochin'],
  coimbatore: ['coimbatore'],
};

// Filler words common in old SEO-stuffed URL slugs ("acne-treatment-in-
// chennai") that add noise to a token-overlap comparison without carrying
// real matching signal. "anti"/"removal"/"correction" are generic
// connector words shared across genuinely unrelated treatments (anti-aging
// vs anti-dandruff; scar removal vs warts removal; melasma correction vs
// butt correction) — confirmed by real false-positive matches, not a
// hypothetical risk.
const NOISE_TOKENS = new Set([
  'in', 'the', 'a', 'an', 'and', 'for', 'of', 'with', 'service', 'services', 'treatment', 'treatments', 'clinic',
  'anti', 'removal', 'correction',
]);

function tokenize(path: string): string[] {
  const cleaned = path.replace(KNOWN_SUFFIXES, '').replace(/^\/+|\/+$/g, '');
  return cleaned
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0 && !NOISE_TOKENS.has(t));
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = Array.from(setA).filter((x) => setB.has(x)).length;
  const union = new Set(Array.from(setA).concat(Array.from(setB))).size;
  return union === 0 ? 0 : intersection / union;
}

function detectCategory(tokens: string[]): string | null {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (tokens.some((t) => keywords.includes(t))) return category;
  }
  return null;
}

function detectCity(tokens: string[]): string | null {
  for (const [city, keywords] of Object.entries(CITY_KEYWORDS)) {
    if (tokens.some((t) => keywords.some((k) => t.startsWith(k)))) return city;
  }
  return null;
}

// SiteUrlEntry has no explicit city field — every city-scoped page's own
// path starts with /{city}/... (see app/lib/siteUrlInventory.ts), so the
// first path segment doubles as its city.
function entryCity(entry: SiteUrlEntry): string | null {
  const first = entry.path.split('/').filter(Boolean)[0];
  return first && CITY_KEYWORDS[first] ? first : null;
}

// Guards the "no redirect chains" rule at the point a mapping is actually
// approved (app/api/admin/domain-migration/redirect-mappings/[id]/route.ts
// and bulk-approve/route.ts) — a newUrl must resolve directly to a real,
// current page, either the homepage itself or a path present in the live
// site inventory, never to another old/unknown path that would just create
// a second hop.
export function isRealCurrentUrl(newUrl: string, inventory: SiteUrlEntry[]): boolean {
  if (newUrl === '/') return true;
  return inventory.some((e) => e.path === newUrl);
}

export function matchUrlDeterministic(oldPath: string, inventory: SiteUrlEntry[]): MatchCandidate {
  const strippedOld = oldPath.replace(KNOWN_SUFFIXES, '');

  // 0. The homepage itself — special-cased rather than relying on the
  // general exact-match search below, because the site's own inventory
  // represents its homepage as path: '' (see siteUrlInventory.ts's
  // staticRoutes(), which needs that for URL-building in app/sitemap.ts),
  // while normalizeOldUrl('/') always returns '/' — the two would never
  // exact-match each other otherwise, and the old site's own root URL
  // would wrongly fall through to "no match" instead of the one case
  // that's always unambiguous.
  if (oldPath === '/') {
    return { newUrl: '/', matchType: 'exact', confidence: 100, confidenceLevel: 'High', reasoning: 'Old site root maps to the new site root.' };
  }

  // 1. Exact path match, with and without a stripped old-CMS suffix — the
  // strongest possible signal, e.g. old "/about" === new "/about".
  const exact = inventory.find((e) => e.path === oldPath || e.path === strippedOld);
  if (exact) {
    return {
      newUrl: exact.path,
      matchType: 'exact',
      confidence: 100,
      confidenceLevel: 'High',
      reasoning: 'Exact path match.',
    };
  }

  const oldTokens = tokenize(oldPath);
  if (oldTokens.length === 0) {
    return { newUrl: null, matchType: null, confidence: 0, confidenceLevel: null, reasoning: 'No usable tokens extracted from the old URL.' };
  }

  // 2. Token-overlap similarity, scoped to the detected category/city when
  // found — keeps candidates relevant instead of comparing against every
  // unrelated page on the site. City scoping matters as much as category:
  // without it, a Bangalore-neighborhood old URL with no exact category
  // match would happily match some *other* city's page purely on leftover
  // token overlap (confirmed — this is a real bug this fixes, not a
  // hypothetical one). Cascades from the most specific pool (both city and
  // category) down to the full inventory, using whichever first pool is
  // non-empty.
  const detectedCategory = detectCategory(oldTokens);
  const detectedCity = detectCity(oldTokens);
  const byCategory = detectedCategory ? inventory.filter((e) => e.category === detectedCategory) : [];
  const byCity = detectedCity ? inventory.filter((e) => entryCity(e) === detectedCity) : [];
  const byBoth = detectedCategory && detectedCity ? byCategory.filter((e) => entryCity(e) === detectedCity) : [];

  const searchPool =
    (byBoth.length > 0 && byBoth) ||
    (byCategory.length > 0 && byCategory) ||
    (byCity.length > 0 && byCity) ||
    inventory;

  let best: { entry: SiteUrlEntry; score: number } | null = null;
  for (const entry of searchPool) {
    const entryTokens = [...tokenize(entry.path), ...(entry.label ? tokenize(entry.label) : [])];
    const score = jaccardSimilarity(oldTokens, entryTokens);
    if (!best || score > best.score) best = { entry, score };
  }
  const bestConfidence = best ? Math.round(best.score * 100) : 0;

  // City-only fallback: when no specific service page scores confidently
  // (including "nothing at all"), but the old URL's own vocabulary
  // confidently names a real city — including old Bangalore-neighborhood
  // terms like Kammanahalli or Hebbal, via CITY_KEYWORDS above — that
  // city's own page is a deliberately low-confidence but still honest
  // redirect target. This is grounded in real evidence extracted from the
  // URL itself, which is exactly what separates it from the "never guess
  // the homepage" rule this engine otherwise holds to — it's never used
  // when no city can be identified, and it only ever wins when it beats
  // whatever the specific-page search actually found.
  const CITY_FALLBACK_CONFIDENCE = 40;
  if (detectedCity && CITY_FALLBACK_CONFIDENCE > bestConfidence) {
    const cityEntry = inventory.find((e) => e.path === `/${detectedCity}`);
    if (cityEntry) {
      return {
        newUrl: cityEntry.path,
        matchType: 'rule',
        confidence: CITY_FALLBACK_CONFIDENCE,
        confidenceLevel: deriveConfidenceLevel(CITY_FALLBACK_CONFIDENCE),
        reasoning: `No specific service page matched confidently — falling back to the ${detectedCity} city page since the old URL identifies it as ${detectedCity}-specific.`,
      };
    }
  }

  if (!best || best.score === 0) {
    return { newUrl: null, matchType: null, confidence: 0, confidenceLevel: null, reasoning: 'No overlapping keywords found against the current site.' };
  }

  const scopeParts = [detectedCategory && `"${detectedCategory}" category`, detectedCity && `"${detectedCity}" city`].filter(Boolean);
  return {
    newUrl: best.entry.path,
    matchType: 'rule',
    confidence: bestConfidence,
    confidenceLevel: deriveConfidenceLevel(bestConfidence),
    reasoning: scopeParts.length
      ? `Matched within the detected ${scopeParts.join(' + ')} by keyword overlap.`
      : "Matched by keyword overlap against the site's full URL inventory.",
  };
}
