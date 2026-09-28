import { describe, it, expect } from 'vitest';
import { isBlogCityPageCanonicalSelf } from '@/app/lib/blogSeo';

const post = (locationSeo?: any[]) => ({ title: 'T', targetLocations: ['chennai'], locationSeo });

describe('isBlogCityPageCanonicalSelf', () => {
  it('is not self-canonical with no per-city override at all', () => {
    expect(isBlogCityPageCanonicalSelf(post(), 'chennai')).toBe(false);
  });
  it('is not self-canonical when the override exists but is not marked customized', () => {
    expect(isBlogCityPageCanonicalSelf(post([{ location: 'chennai', metaTitle: 'x', isCustomized: false }]), 'chennai')).toBe(false);
  });
  it('is self-canonical once an admin customizes this city', () => {
    expect(isBlogCityPageCanonicalSelf(post([{ location: 'chennai', metaTitle: 'x', isCustomized: true }]), 'chennai')).toBe(true);
  });
  it('is not self-canonical for a different city than the one customized', () => {
    expect(isBlogCityPageCanonicalSelf(post([{ location: 'chennai', metaTitle: 'x', isCustomized: true }]), 'bangalore')).toBe(false);
  });
});
