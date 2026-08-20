import { describe, it, expect } from 'vitest';
import { matchUrlDeterministic, isRealCurrentUrl } from '@/app/lib/domainMigration/matchUrl';
import type { SiteUrlEntry } from '@/app/lib/siteUrlInventory';

const now = new Date();
const INVENTORY: SiteUrlEntry[] = [
  { path: '/about', lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  { path: '/chennai', lastModified: now, changeFrequency: 'weekly', priority: 0.9, label: 'chennai' },
  { path: '/chennai/services/hair', lastModified: now, changeFrequency: 'weekly', priority: 0.8, category: 'hair', label: 'chennai hair services' },
  {
    path: '/chennai/services/hair/hair-transplant',
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
    category: 'hair',
    label: 'Hair Transplant',
  },
  {
    path: '/chennai/services/skin/acne-treatment',
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
    category: 'skin',
    label: 'Acne Treatment',
  },
  {
    path: '/chennai/services/laser/laser-hair-reduction',
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
    category: 'laser',
    label: 'Laser Hair Reduction',
  },
];

describe('matchUrlDeterministic', () => {
  it('matches an exact path with 100 confidence', () => {
    const r = matchUrlDeterministic('/about', INVENTORY);
    expect(r).toMatchObject({ newUrl: '/about', matchType: 'exact', confidence: 100, confidenceLevel: 'High' });
  });

  it('matches an exact path after stripping a legacy CMS suffix (.aspx)', () => {
    const r = matchUrlDeterministic('/about.aspx', INVENTORY);
    expect(r).toMatchObject({ newUrl: '/about', matchType: 'exact', confidence: 100 });
  });

  it('matches "acne-treatment-chennai" style old URL to the new acne treatment service via category+keyword overlap', () => {
    const r = matchUrlDeterministic('/acne-treatment-chennai', INVENTORY);
    expect(r.newUrl).toBe('/chennai/services/skin/acne-treatment');
    expect(r.matchType).toBe('rule');
    expect(r.confidence).toBeGreaterThan(0);
  });

  it('matches a differently-worded old hair transplant URL to the current hair transplant service', () => {
    const r = matchUrlDeterministic('/service/hair-transplant-in-chennai/', INVENTORY);
    expect(r.newUrl).toBe('/chennai/services/hair/hair-transplant');
    expect(r.matchType).toBe('rule');
  });

  it('does not cross-match a hair-category old URL onto a skin/laser page', () => {
    const r = matchUrlDeterministic('/hair-loss-treatment', INVENTORY);
    expect(r.newUrl).not.toBe('/chennai/services/skin/acne-treatment');
    expect(r.newUrl).not.toBe('/chennai/services/laser/laser-hair-reduction');
  });

  it('returns no match (never a guess, never "/") for a URL with no real equivalent on the current site', () => {
    const r = matchUrlDeterministic('/some-completely-unrelated-old-page-xyz', INVENTORY);
    expect(r.newUrl).toBeNull();
    expect(r.matchType).toBeNull();
    expect(r.confidence).toBe(0);
  });

  it('never returns the homepage "/" as a fallback for an unmatched URL', () => {
    for (const path of ['/old-something', '/random-legacy-page', '/xyzabc123']) {
      const r = matchUrlDeterministic(path, INVENTORY);
      expect(r.newUrl).not.toBe('/');
    }
  });

  it('handles an old URL with no usable tokens (e.g. just slashes) without throwing', () => {
    const r = matchUrlDeterministic('/', INVENTORY);
    expect(r.newUrl).toBeNull();
    expect(r.confidence).toBe(0);
  });
});

// A second, multi-city inventory — reproduces the exact false-positive
// matches found reviewing a real 253-URL import from the old site
// (dryouthclinic.co.in), each confirmed wrong before this fix.
const MULTI_CITY_INVENTORY: SiteUrlEntry[] = [
  { path: '/bangalore', lastModified: now, changeFrequency: 'weekly', priority: 0.9, label: 'bangalore' },
  { path: '/chennai', lastModified: now, changeFrequency: 'weekly', priority: 0.9, label: 'chennai' },
  {
    path: '/chennai/services/skin/lip-pigmentation',
    lastModified: now, changeFrequency: 'weekly', priority: 0.8, category: 'skin', label: 'Lip Pigmentation',
  },
  {
    path: '/bangalore/services/skin/lip-pigmentation',
    lastModified: now, changeFrequency: 'weekly', priority: 0.8, category: 'skin', label: 'Lip Pigmentation',
  },
  {
    path: '/chennai/services/hair/anti-dandruff',
    lastModified: now, changeFrequency: 'weekly', priority: 0.8, category: 'hair', label: 'Anti-Dandruff Treatment',
  },
  {
    path: '/chennai/services/hair/anti-aging',
    lastModified: now, changeFrequency: 'weekly', priority: 0.8, category: 'hair', label: 'Anti-Aging Treatment',
  },
  {
    path: '/bangalore/services/other/butt-correction',
    lastModified: now, changeFrequency: 'weekly', priority: 0.8, category: 'other', label: 'Butt Correction',
  },
  {
    path: '/bangalore/services/skin/melasma-correction',
    lastModified: now, changeFrequency: 'weekly', priority: 0.8, category: 'skin', label: 'Melasma Correction',
  },
  {
    path: '/bangalore/services/skin/warts-removal',
    lastModified: now, changeFrequency: 'weekly', priority: 0.8, category: 'skin', label: 'Warts Removal',
  },
];

describe('matchUrlDeterministic — city scoping (real bug found reviewing a live import)', () => {
  it('matches a Bangalore-neighborhood old URL to Bangalore\'s own page, not another city\'s', () => {
    // Kammanahalli is a real Bangalore neighborhood the old site had its
    // own SEO page for — before city-detection, this incorrectly matched
    // Chennai's lip-pigmentation page instead (pure token-overlap, no
    // city awareness at all).
    const r = matchUrlDeterministic('/services/lip-pigmentation-in-kammanahalli', MULTI_CITY_INVENTORY);
    expect(r.newUrl).toBe('/bangalore/services/skin/lip-pigmentation');
  });

  it('recognizes other Bangalore-neighborhood vocabulary the same way', () => {
    for (const path of [
      '/services/warts-removal-in-hebbal',
      '/services/lip-pigmentation-in-banaswadi',
      '/services/lip-pigmentation-in-nagawara',
      '/services/lip-pigmentation-in-hrbr-layout',
    ]) {
      const r = matchUrlDeterministic(path, MULTI_CITY_INVENTORY);
      expect(r.newUrl).not.toBe('/chennai/services/skin/lip-pigmentation');
    }
  });
});

describe('matchUrlDeterministic — false-positive fixes (real bad matches found reviewing a live import)', () => {
  it('does not confuse "anti-aging" with "anti-dandruff" (shared "anti" token only)', () => {
    const r = matchUrlDeterministic('/anti-aging-chennai', MULTI_CITY_INVENTORY);
    expect(r.newUrl).not.toBe('/chennai/services/hair/anti-dandruff');
  });

  it('does not confuse "melasma correction" with "butt correction" (shared "correction" token only)', () => {
    const r = matchUrlDeterministic('/melasma-correction-treatment-in-bangalore', MULTI_CITY_INVENTORY);
    expect(r.newUrl).not.toBe('/bangalore/services/other/butt-correction');
    expect(r.newUrl).toBe('/bangalore/services/skin/melasma-correction');
  });

  it('does not confuse "scar removal" with "warts removal" (shared "removal" token only)', () => {
    const r = matchUrlDeterministic('/scar-removal-treatment-in-bangalore', MULTI_CITY_INVENTORY);
    expect(r.newUrl).not.toBe('/bangalore/services/skin/warts-removal');
  });
});

describe('isRealCurrentUrl — the "no redirect chains" guard used at approval time', () => {
  it('accepts the homepage', () => {
    expect(isRealCurrentUrl('/', INVENTORY)).toBe(true);
  });
  it('accepts a path present in the live site inventory', () => {
    expect(isRealCurrentUrl('/chennai/services/hair/hair-transplant', INVENTORY)).toBe(true);
  });
  it('rejects a path not present in the inventory (would create a dangling or chained redirect)', () => {
    expect(isRealCurrentUrl('/some-made-up-path', INVENTORY)).toBe(false);
  });
  it('rejects another old-looking URL being used as a "new" target', () => {
    expect(isRealCurrentUrl('/about-us.aspx', INVENTORY)).toBe(false);
  });
});
