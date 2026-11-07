import { describe, it, expect } from 'vitest';
import { isDiwaliSeason } from '@/app/lib/festive';

describe('isDiwaliSeason', () => {
  it('starts at 12 AM on Diwali day and runs through 13 Nov, India time', () => {
    expect(isDiwaliSeason(new Date('2026-11-08T00:00:00+05:30'))).toBe(true);
    expect(isDiwaliSeason(new Date('2026-11-08T12:00:00+05:30'))).toBe(true);
    expect(isDiwaliSeason(new Date('2026-11-13T23:59:00+05:30'))).toBe(true);
  });

  it('is off before Diwali day and after 13 Nov ends', () => {
    expect(isDiwaliSeason(new Date('2026-11-07T23:59:00+05:30'))).toBe(false);
    expect(isDiwaliSeason(new Date('2026-11-14T00:00:00+05:30'))).toBe(false);
    expect(isDiwaliSeason(new Date('2027-11-08T12:00:00+05:30'))).toBe(false);
  });
});
