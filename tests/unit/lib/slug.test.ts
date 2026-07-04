import { describe, it, expect } from 'vitest';

// Replicates the slug generation logic from Service model (models/Service.ts)
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

describe('Service URL slug generation', () => {
  it('converts name to lowercase hyphenated slug', () => {
    expect(generateSlug('Laser Hair Removal')).toBe('laser-hair-removal');
  });

  it('strips special characters', () => {
    expect(generateSlug('PRP Therapy (Advanced)')).toBe('prp-therapy-advanced');
  });

  it('collapses multiple spaces and hyphens', () => {
    expect(generateSlug('HydraFacial  Deep  Cleanse')).toBe('hydrafacial-deep-cleanse');
  });

  it('handles single word names', () => {
    expect(generateSlug('Botox')).toBe('botox');
  });

  it('handles names with numbers', () => {
    expect(generateSlug('Q-Switch Laser 1064nm')).toBe('q-switch-laser-1064nm');
  });

  it('produces non-empty output for valid input', () => {
    const slug = generateSlug('Skin Treatment');
    expect(slug.length).toBeGreaterThan(0);
    expect(slug).not.toMatch(/\s/);
  });
});
