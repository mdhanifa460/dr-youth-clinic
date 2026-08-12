import { describe, it, expect } from 'vitest';
import { canonicalizeLocation, BRANCH_SLUGS } from '@/app/lib/locationNormalize';

describe('BRANCH_SLUGS', () => {
  it('is the 4 real clinic branches, derived from app/data/locations.ts', () => {
    expect(BRANCH_SLUGS.sort()).toEqual(['bangalore', 'chennai', 'coimbatore', 'kochi']);
  });
});

describe('canonicalizeLocation', () => {
  it('passes through an exact lowercase slug', () => {
    expect(canonicalizeLocation('chennai')).toBe('chennai');
  });

  it('normalizes a capitalized label (the /book Form.tsx convention)', () => {
    expect(canonicalizeLocation('Chennai')).toBe('chennai');
  });

  it('normalizes surrounding whitespace', () => {
    expect(canonicalizeLocation('  Bangalore  ')).toBe('bangalore');
  });

  it('tolerates free-text variants that contain a real branch slug', () => {
    expect(canonicalizeLocation('Chennai Clinic')).toBe('chennai');
    expect(canonicalizeLocation('kochi-branch')).toBe('kochi');
  });

  it('returns null for empty, missing, or unrelated values', () => {
    expect(canonicalizeLocation('')).toBeNull();
    expect(canonicalizeLocation(undefined)).toBeNull();
    expect(canonicalizeLocation(null)).toBeNull();
    expect(canonicalizeLocation('Mumbai')).toBeNull();
  });

  it('returns null for non-string input rather than throwing', () => {
    expect(canonicalizeLocation(123 as any)).toBeNull();
    expect(canonicalizeLocation({} as any)).toBeNull();
  });
});
