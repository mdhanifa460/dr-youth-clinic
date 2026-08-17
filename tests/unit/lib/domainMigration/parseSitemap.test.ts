import { describe, it, expect } from 'vitest';
import {
  extractLocsFromSitemapXml,
  looksLikeSitemapUrl,
  normalizeOldUrl,
  parseSitemapUrls,
} from '@/app/lib/domainMigration/parseSitemap';

const SAMPLE_URLSET = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://dryouthclinic.co.in/acne-treatment-chennai/</loc></url>
  <url><loc>https://dryouthclinic.co.in/about-us.aspx</loc></url>
  <url><loc>https://dryouthclinic.co.in/contact-us.aspx</loc></url>
  <url><loc>https://dryouthclinic.co.in/blog/hair-fall-tips?utm_source=old</loc></url>
</urlset>`;

const SAMPLE_INDEX = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://dryouthclinic.co.in/sitemap-pages.xml</loc></sitemap>
  <sitemap><loc>https://dryouthclinic.co.in/sitemap-posts.xml</loc></sitemap>
</sitemapindex>`;

describe('extractLocsFromSitemapXml', () => {
  it('extracts every <loc> value from a real urlset sitemap', () => {
    expect(extractLocsFromSitemapXml(SAMPLE_URLSET)).toEqual([
      'https://dryouthclinic.co.in/acne-treatment-chennai/',
      'https://dryouthclinic.co.in/about-us.aspx',
      'https://dryouthclinic.co.in/contact-us.aspx',
      'https://dryouthclinic.co.in/blog/hair-fall-tips?utm_source=old',
    ]);
  });

  it('extracts <loc> entries from a sitemap index the same way', () => {
    expect(extractLocsFromSitemapXml(SAMPLE_INDEX)).toEqual([
      'https://dryouthclinic.co.in/sitemap-pages.xml',
      'https://dryouthclinic.co.in/sitemap-posts.xml',
    ]);
  });

  it('decodes common XML entities in a URL (e.g. an & in a query string)', () => {
    const xml = `<urlset><url><loc>https://old.com/page?a=1&amp;b=2</loc></url></urlset>`;
    expect(extractLocsFromSitemapXml(xml)).toEqual(['https://old.com/page?a=1&b=2']);
  });

  it('returns an empty array for XML with no <loc> tags, never throws', () => {
    expect(extractLocsFromSitemapXml('<urlset></urlset>')).toEqual([]);
    expect(extractLocsFromSitemapXml('not even xml')).toEqual([]);
    expect(extractLocsFromSitemapXml('')).toEqual([]);
  });
});

describe('looksLikeSitemapUrl', () => {
  it('identifies a sitemap-index child URL', () => {
    expect(looksLikeSitemapUrl('https://old.com/sitemap-pages.xml')).toBe(true);
    expect(looksLikeSitemapUrl('https://old.com/sitemap.xml.gz')).toBe(true);
  });
  it('does not flag a real page URL', () => {
    expect(looksLikeSitemapUrl('https://old.com/about-us.aspx')).toBe(false);
    expect(looksLikeSitemapUrl('https://old.com/services/acne-treatment')).toBe(false);
  });
});

describe('normalizeOldUrl', () => {
  it('strips scheme, host, query, and fragment, keeping only the path', () => {
    expect(normalizeOldUrl('https://dryouthclinic.co.in/About-Us.aspx?ref=nav#top')).toBe('/about-us.aspx');
  });
  it('lowercases the path', () => {
    expect(normalizeOldUrl('https://old.com/Acne-Treatment-Chennai/')).toBe('/acne-treatment-chennai');
  });
  it('collapses a trailing slash, except for the root path itself', () => {
    expect(normalizeOldUrl('https://old.com/contact-us/')).toBe('/contact-us');
    expect(normalizeOldUrl('https://old.com/')).toBe('/');
  });
  it('handles an already-bare path (no scheme/host) without throwing', () => {
    expect(normalizeOldUrl('/about-us')).toBe('/about-us');
    expect(normalizeOldUrl('about-us')).toBe('/about-us');
  });
  it('strips a query string from an already-bare path too', () => {
    expect(normalizeOldUrl('/search?q=hair')).toBe('/search');
  });
});

describe('parseSitemapUrls', () => {
  it('extracts, normalizes, and dedupes real page URLs across multiple XML documents', () => {
    const doc2 = `<urlset><url><loc>https://dryouthclinic.co.in/About-Us.aspx</loc></url></urlset>`; // dup of doc1's normalized form
    const result = parseSitemapUrls([SAMPLE_URLSET, doc2]);
    expect(result).toContain('/acne-treatment-chennai');
    expect(result).toContain('/about-us.aspx');
    expect(result).toContain('/contact-us.aspx');
    expect(result).toContain('/blog/hair-fall-tips');
    // deduped: about-us.aspx only appears once despite being in both docs
    expect(result.filter((u) => u === '/about-us.aspx')).toHaveLength(1);
  });

  it('excludes sitemap-index child URLs (.xml) from the result — those are not real pages', () => {
    const result = parseSitemapUrls([SAMPLE_INDEX]);
    expect(result).toEqual([]);
  });

  it('returns a sorted array', () => {
    const result = parseSitemapUrls([SAMPLE_URLSET]);
    expect(result).toEqual([...result].sort());
  });
});
