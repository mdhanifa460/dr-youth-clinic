import { describe, it, expect } from 'vitest';
import { buildLocationMetadata, sanitizeLocationSeo } from '@/app/lib/locationSeo';
import { bannersForCity } from '@/app/admin/components/LocationBannersPanel';

const base = {
  cityKey: 'chennai',
  cityName: 'Chennai',
  specialties: ['Acne', 'Hair Loss', 'Pigmentation', 'Laser', 'Extra'],
  siteUrl: 'https://example.com',
};

describe('buildLocationMetadata', () => {
  it('keeps the existing template when no SEO is set', () => {
    const m = buildLocationMetadata(base);
    expect(m.title).toBe('Skin, Hair & Aesthetic Clinic in Chennai');
    expect(m.description).toContain('Acne, Hair Loss, Pigmentation, Laser.');
    expect(m.description).not.toContain('Extra');
    expect(m.alternates?.canonical).toBe('https://example.com/chennai');
    expect(m.robots).toBeUndefined();
    expect(m.keywords).toBeUndefined();
  });

  it('uses the admin title, description and keywords', () => {
    const m = buildLocationMetadata({
      ...base,
      seo: {
        metaTitle: 'Best Skin Clinic in Chennai',
        metaDescription: 'Dermatologist-led skin, hair and laser care at our Anna Nagar clinic in Chennai. Book a consultation.',
        keywords: ['skin clinic chennai'],
      },
    });
    expect(m.title).toBe('Best Skin Clinic in Chennai');
    expect(m.description).toMatch(/^Dermatologist-led/);
    expect(m.keywords).toEqual(['skin clinic chennai']);
  });

  it('falls back to the default when the admin description is too short to use', () => {
    const m = buildLocationMetadata({ ...base, seo: { metaDescription: 'Too short.' } });
    expect(m.description).toContain('Skin, hair and laser treatments');
  });

  it('always sets a share image: admin image, then hero photo, then the site image', () => {
    const img = (m: any) => m.openGraph.images[0].url;
    expect(img(buildLocationMetadata(base))).toBe('https://example.com/og-image.jpg');
    expect(img(buildLocationMetadata({ ...base, heroImageUrl: 'https://cdn/hero.jpg' }))).toBe('https://cdn/hero.jpg');
    expect(img(buildLocationMetadata({ ...base, heroImageUrl: 'https://cdn/hero.jpg', seo: { ogImage: { url: 'https://cdn/og.jpg', publicId: 'og' } } }))).toBe('https://cdn/og.jpg');
    expect((buildLocationMetadata(base).twitter as any).images).toEqual(['https://example.com/og-image.jpg']);
  });

  it('adds noindex only when asked, and keeps links followed', () => {
    expect(buildLocationMetadata({ ...base, seo: { noindex: true } }).robots).toEqual({ index: false, follow: true });
  });
});

describe('sanitizeLocationSeo', () => {
  it('trims, caps lengths and de-duplicates keywords', () => {
    const s = sanitizeLocationSeo({
      metaTitle: '  ' + 'a'.repeat(80),
      metaDescription: 'b'.repeat(200),
      keywords: [' Skin ', 'skin', '', 'Hair'],
    });
    expect(s.metaTitle).toHaveLength(60);
    expect(s.metaDescription).toHaveLength(160);
    expect(s.keywords).toEqual(['Skin', 'Hair']);
  });

  it('accepts a comma string of keywords and limits them to 15', () => {
    const s = sanitizeLocationSeo({ keywords: Array.from({ length: 20 }, (_, i) => `k${i}`).join(',') as any });
    expect(s.keywords).toHaveLength(15);
  });

  it('drops a non-https share image and treats only true as noindex', () => {
    const s = sanitizeLocationSeo({ ogImage: { url: 'javascript:alert(1)', publicId: 'x' }, noindex: 'true' as any });
    expect(s.ogImage).toEqual({ url: '', publicId: '' });
    expect(s.noindex).toBe(false);
  });

  it('handles junk input', () => {
    expect(sanitizeLocationSeo(null)).toEqual({ metaTitle: '', metaDescription: '', keywords: [], ogImage: { url: '', publicId: '' }, noindex: false });
  });
});

describe('bannersForCity', () => {
  const all = [
    { _id: 'a', showOnLocationPage: true, targetLocations: [], order: 2 },
    { _id: 'b', showOnLocationPage: true, targetLocations: ['chennai'], order: 1 },
    { _id: 'c', showOnLocationPage: true, targetLocations: ['kochi'], order: 0 },
    { _id: 'd', showOnLocationPage: false, targetLocations: ['chennai'], order: 0 },
    { _id: 'e', showOnLocationPage: true, order: 2, priority: 5 },
  ];
  it('lists city-targeted and all-city location banners in display order', () => {
    expect(bannersForCity(all, 'chennai').map((b) => b._id)).toEqual(['b', 'e', 'a']);
  });
});

import { resolveLocationHero, sanitizeLocationHero, safeHref } from '@/app/lib/locationHero';

describe('resolveLocationHero', () => {
  it('keeps today\'s wording for an untouched city', () => {
    const h = resolveLocationHero(null, 'bangalore', 'Bangalore');
    expect(h.title).toBe('Advanced Skin & Aesthetic Care');
    expect(h.highlight).toBe('in Bangalore');
    expect(h.badge).toBe('DR Youth Clinic — Bangalore');
    expect(h.primaryCtaHref).toBe('/book?location=bangalore');
    expect(h.style).toBe('classic');
    expect(h.bannerPlacement).toBe('replace');
    expect(h.showCallButton).toBe(true);
  });
  it('uses admin values, and image style only once an image exists', () => {
    expect(resolveLocationHero({ style: 'image' }, 'kochi', 'Kochi').style).toBe('classic');
    const h = resolveLocationHero({ style: 'image', bgImage: { url: 'https://cdn/x.jpg', publicId: 'x' }, title: 'Skin Experts', offerText: '20% off', bannerPlacement: 'above' }, 'kochi', 'Kochi');
    expect(h.style).toBe('image');
    expect(h.title).toBe('Skin Experts');
    expect(h.offerText).toBe('20% off');
    expect(h.bannerPlacement).toBe('above');
  });
});

describe('locationHero sanitising', () => {
  it('only allows safe links', () => {
    expect(safeHref('/offers')).toBe('/offers');
    expect(safeHref('https://x.com')).toBe('https://x.com');
    expect(safeHref('javascript:alert(1)')).toBe('');
    expect(safeHref('//evil.com')).toBe('');
  });
  it('rejects unknown enum values and caps text', () => {
    const h = sanitizeLocationHero({ style: 'weird', overlay: 'x', bannerPlacement: 'y', title: 'a'.repeat(200), showCallButton: false });
    expect(h.style).toBe('classic');
    expect(h.overlay).toBe('medium');
    expect(h.bannerPlacement).toBe('replace');
    expect(h.title).toHaveLength(80);
    expect(h.showCallButton).toBe(false);
  });
});
