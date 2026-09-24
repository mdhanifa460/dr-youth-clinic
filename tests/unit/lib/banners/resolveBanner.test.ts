import { describe, it, expect } from 'vitest';
import { deriveTargetPages, inMonthWindow, endOfDayUTC } from '@/app/lib/banners/resolveBanner';

describe('deriveTargetPages', () => {
  it('returns an empty list when nothing is enabled', () => {
    expect(deriveTargetPages({})).toEqual([]);
  });

  it('includes each enabled surface, in a stable order', () => {
    expect(
      deriveTargetPages({
        showOnHomepage: true,
        showOnLocationPage: true,
        showOnServicePage: true,
        showOnCategoryPage: true,
        showOnLandingPage: true,
      })
    ).toEqual(['homepage', 'location', 'service', 'category', 'landing']);
  });

  it('includes "landing" for a landing-page-only banner', () => {
    expect(deriveTargetPages({ showOnLandingPage: true })).toEqual(['landing']);
  });

  it('omits surfaces that are explicitly false', () => {
    expect(deriveTargetPages({ showOnHomepage: false, showOnServicePage: true, showOnLandingPage: false })).toEqual(['service']);
  });
});

describe('inMonthWindow', () => {
  it('handles a normal window', () => {
    expect(inMonthWindow(4, 3, 6)).toBe(true);
    expect(inMonthWindow(7, 3, 6)).toBe(false);
  });

  it('handles a year-wrapping window (Nov-Feb)', () => {
    expect(inMonthWindow(12, 11, 2)).toBe(true);
    expect(inMonthWindow(1, 11, 2)).toBe(true);
    expect(inMonthWindow(6, 11, 2)).toBe(false);
  });
});

describe('endOfDayUTC', () => {
  it('moves a midnight timestamp to the end of that same UTC day', () => {
    const d = endOfDayUTC('2026-09-24T00:00:00.000Z');
    expect(d.toISOString()).toBe('2026-09-24T23:59:59.999Z');
  });
});
