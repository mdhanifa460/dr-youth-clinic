import { describe, it, expect } from 'vitest';
import { resolveFooterHref, resolveFooterLocation } from '@/app/lib/footerLinks';

// Regression coverage for the "footer links always redirect to home" bug —
// the legacy `/#services`/`/#contact` sentinel hrefs only ever resolved
// correctly when already on the homepage.
describe('resolveFooterHref', () => {
  it('rewrites the /#services sentinel to a real, city-scoped services page', () => {
    expect(resolveFooterHref('/#services', 'Procedures', 'bangalore')).toBe('/bangalore/services');
  });

  it('maps known procedure labels to their category-listing page', () => {
    expect(resolveFooterHref('/#services', 'Hair Transplant', 'chennai')).toBe('/chennai/services/hair');
    expect(resolveFooterHref('/#services', 'PRP Therapy', 'chennai')).toBe('/chennai/services/hair');
    expect(resolveFooterHref('/#services', 'Laser & Skin Treatments', 'kochi')).toBe('/kochi/services/laser');
  });

  it('is case/whitespace-insensitive when matching a procedure label', () => {
    expect(resolveFooterHref('/#services', '  hair transplant  ', 'chennai')).toBe('/chennai/services/hair');
  });

  it('falls back to the plain services page for an unmapped label (e.g. "View All Procedures")', () => {
    expect(resolveFooterHref('/#services', 'View All Procedures', 'coimbatore')).toBe('/coimbatore/services');
  });

  it('rewrites the /#contact sentinel to the city page\'s contact section', () => {
    expect(resolveFooterHref('/#contact', 'Contact Us', 'chennai')).toBe('/chennai#contact');
  });

  it('leaves any other href (real routes, admin-customized links) untouched', () => {
    expect(resolveFooterHref('/results', 'Results', 'chennai')).toBe('/results');
    expect(resolveFooterHref('/privacy-policy', 'Privacy Policy', 'chennai')).toBe('/privacy-policy');
    expect(resolveFooterHref('https://instagram.com/dryouthclinic', 'Instagram', 'chennai')).toBe(
      'https://instagram.com/dryouthclinic'
    );
  });
});

describe('resolveFooterLocation', () => {
  it('prefers the city segment already in the URL', () => {
    expect(resolveFooterLocation('/bangalore/services/hair/abc', 'chennai')).toBe('bangalore');
  });

  it('falls back to the preferred_location cookie when not on a city page', () => {
    expect(resolveFooterLocation('/blog/some-post', 'kochi')).toBe('kochi');
  });

  it('falls back to chennai when neither the URL nor the cookie has a valid city', () => {
    expect(resolveFooterLocation('/', '')).toBe('chennai');
    expect(resolveFooterLocation('/about', 'not-a-city')).toBe('chennai');
  });

  it('ignores an invalid city segment in the URL and uses the cookie instead', () => {
    expect(resolveFooterLocation('/blog', 'bangalore')).toBe('bangalore');
  });
});
