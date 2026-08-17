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
