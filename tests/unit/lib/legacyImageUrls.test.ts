import { describe, it, expect } from 'vitest';
import { normalizeLegacyImageUrls, normalizeLegacyImageUrl } from '@/app/lib/legacyImageUrls';

describe('normalizeLegacyImageUrl — single value', () => {
  it('passes through a Cloudinary URL unchanged', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/logo.png';
    expect(normalizeLegacyImageUrl(url)).toBe(url);
  });

  it('strips a non-Cloudinary external image URL', () => {
    expect(normalizeLegacyImageUrl('https://example.com/old-wordpress-image.jpg')).toBe('');
  });

  it('passes through relative/local paths unchanged', () => {
    expect(normalizeLegacyImageUrl('/images/hero.jpg')).toBe('/images/hero.jpg');
  });
});

describe('normalizeLegacyImageUrls — recursive object walker', () => {
  it('strips a non-Cloudinary URL on a real image field', () => {
    const data = { logoUrl: 'https://old-cdn.example.com/logo.png' };
    expect(normalizeLegacyImageUrls(data).logoUrl).toBe('');
  });

  it('never strips socialLinks entries — a YouTube/social URL is not an image src', () => {
    // Regression test: a YouTube socialLinks entry was silently wiped to ''
    // on every homepage read because youtube.com isn't Cloudinary — the
    // strip-non-Cloudinary rule is only ever meant for actual <Image> src
    // fields, never for hyperlinks that happen to share the `url` key name.
    const data = {
      socialLinks: [
        { platform: 'youtube', url: 'https://www.youtube.com/@dryouthclinicofficial' },
        { platform: 'facebook', url: 'https://www.facebook.com/dryouthclinic' },
        { platform: 'whatsapp', url: '919876543210' },
      ],
    };
    const result = normalizeLegacyImageUrls(data);
    expect(result.socialLinks[0].url).toBe('https://www.youtube.com/@dryouthclinicofficial');
    expect(result.socialLinks[1].url).toBe('https://www.facebook.com/dryouthclinic');
    expect(result.socialLinks[2].url).toBe('919876543210');
  });

  it('still strips a non-Cloudinary image nested elsewhere in the same tree', () => {
    const data = {
      socialLinks: [{ platform: 'youtube', url: 'https://www.youtube.com/@dryouthclinicofficial' }],
      hero: { backgroundImage: 'https://old-cdn.example.com/bg.jpg' },
    };
    const result = normalizeLegacyImageUrls(data);
    expect(result.socialLinks[0].url).toBe('https://www.youtube.com/@dryouthclinicofficial');
    expect(result.hero.backgroundImage).toBe('');
  });
});
