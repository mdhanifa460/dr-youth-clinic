import { describe, it, expect } from 'vitest';
import { isDiwaliSeason } from '@/app/lib/festive';

describe('isDiwaliSeason', () => {
  it('is on around Diwali', () => {
    expect(isDiwaliSeason(new Date('2026-11-08T12:00:00+05:30'))).toBe(true);
    expect(isDiwaliSeason(new Date('2026-10-30T00:00:00+05:30'))).toBe(true);
  });

  it('is off outside the window, in India time', () => {
    expect(isDiwaliSeason(new Date('2026-10-29T23:59:00+05:30'))).toBe(false);
    expect(isDiwaliSeason(new Date('2026-11-13T00:00:00+05:30'))).toBe(false);
    expect(isDiwaliSeason(new Date('2027-11-08T12:00:00+05:30'))).toBe(false);
  });
});
