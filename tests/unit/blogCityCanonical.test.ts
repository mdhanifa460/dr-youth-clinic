import { describe, it, expect } from 'vitest';
import { isBlogCityPageCanonicalSelf } from '@/app/lib/blogSeo';

const post = (locationSeo?: any[], metaTitle = 'Shared Title') =>
  ({ title: 'T', metaTitle, targetLocations: ['chennai'], locationSeo });

describe('isBlogCityPageCanonicalSelf', () => {
  it('is not self-canonical with no per-city override at all', () => {
    expect(isBlogCityPageCanonicalSelf(post(), 'chennai')).toBe(false);
  });
  it('is not self-canonical when isCustomized but the title text is identical', () => {
    // Confirmed live: an admin opening the per-city panel sets isCustomized
    // as soon as any field is touched, even without changing the text.
    expect(isBlogCityPageCanonicalSelf(post([{ location: 'chennai', metaTitle: 'Shared Title', isCustomized: true }]), 'chennai')).toBe(false);
  });
  it('ignores a redundant trailing brand suffix when comparing titles', () => {
    expect(isBlogCityPageCanonicalSelf(post([{ location: 'chennai', metaTitle: 'Shared Title | DR Youth Clinic', isCustomized: true }]), 'chennai')).toBe(false);
  });
  it('is self-canonical once the title text is genuinely different', () => {
    expect(isBlogCityPageCanonicalSelf(post([{ location: 'chennai', metaTitle: 'Genuinely Different Title', isCustomized: true }]), 'chennai')).toBe(true);
  });
  it('is self-canonical when only the description text differs', () => {
    const p = post([{ location: 'chennai', metaTitle: 'Shared Title', metaDescription: 'A different description', isCustomized: true }]);
    expect(isBlogCityPageCanonicalSelf(p, 'chennai')).toBe(true);
  });
  it('is not self-canonical for a different city than the one customized', () => {
    expect(isBlogCityPageCanonicalSelf(post([{ location: 'chennai', metaTitle: 'Genuinely Different Title', isCustomized: true }]), 'bangalore')).toBe(false);
  });
});
