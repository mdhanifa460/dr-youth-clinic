import { describe, it, expect } from 'vitest';
import { pageTitle, clampDescription, metaDescription } from '@/app/lib/seoText';

describe('pageTitle', () => {
  it('keeps short titles so the layout adds the clinic name', () => {
    expect(pageTitle('About Us')).toBe('About Us');
  });
  it('drops the suffix when the title already names the clinic', () => {
    expect(pageTitle('Hair Fall Treatment in Chennai | DR Youth Clinic')).toEqual({ absolute: 'Hair Fall Treatment in Chennai | DR Youth Clinic' });
  });
  it('removes a repeated clinic name', () => {
    expect(pageTitle('GFC vs PRP in Chennai | DR Youth Clinic | DR Youth Clinic')).toEqual({ absolute: 'GFC vs PRP in Chennai | DR Youth Clinic' });
    expect(pageTitle('Glowing Skin | DR Youth Clinics | DR Youth Clinic')).toEqual({ absolute: 'Glowing Skin | DR Youth Clinics' });
  });
  it('drops the suffix when it would make the title too long, without cutting the words', () => {
    const t = 'Microneedling Treatment in Chennai | Acne Scar Removal';
    expect(pageTitle(t)).toEqual({ absolute: t });
  });
  it('falls back to the clinic name when empty', () => {
    expect(pageTitle('')).toBe('DR Youth Clinic');
    expect(pageTitle(undefined)).toBe('DR Youth Clinic');
  });
});

describe('clampDescription', () => {
  it('leaves descriptions that fit', () => {
    expect(clampDescription('Short and fine.')).toBe('Short and fine.');
  });
  it('cuts at a sentence end when one is close', () => {
    const s = 'A'.repeat(120) + '. Second sentence goes well past the limit so it should be dropped entirely here.';
    expect(clampDescription(s)).toBe('A'.repeat(120) + '.');
  });
  it('otherwise cuts at a word with an ellipsis, within 160 characters', () => {
    const s = Array(60).fill('word').join(' ');
    const out = clampDescription(s);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith('word…')).toBe(true);
  });
});

describe('metaDescription', () => {
  it('uses the first candidate that is long enough', () => {
    const long = 'Meet the doctor, a consultant aesthetic physician at DR Youth Clinic in Chennai and Bangalore.';
    expect(metaDescription('Too short', long)).toBe(long);
  });
  it('uses the longest when none is long enough', () => {
    expect(metaDescription('abc', 'abcdef', '')).toBe('abcdef');
  });
  it('returns empty when there is nothing', () => {
    expect(metaDescription(undefined, null, '')).toBe('');
  });
});
