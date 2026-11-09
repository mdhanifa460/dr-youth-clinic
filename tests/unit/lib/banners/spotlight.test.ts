import { describe, it, expect } from 'vitest';
import {
  isSpotlightLive,
  istInputToIso,
  isoToIstInput,
  spotlightPublishError,
  getSpotlightTheme,
  SPOTLIGHT_THEMES,
  SPOTLIGHT_THEME_DEFS,
} from '@/app/lib/banners/spotlight';

// Diwali 2026 as it actually ran: 12:00 AM on 8 Nov to 12:00 AM on 9 Nov, India time.
const diwali = {
  startDate: '2026-11-07T18:30:00.000Z',
  endDate: '2026-11-08T18:30:00.000Z',
};

describe('isSpotlightLive', () => {
  it('is on from the exact start moment, India time', () => {
    expect(isSpotlightLive(diwali, new Date('2026-11-08T00:00:00+05:30'))).toBe(true);
    expect(isSpotlightLive(diwali, new Date('2026-11-08T23:59:00+05:30'))).toBe(true);
  });

  it('is off before the start and from the exact end moment', () => {
    expect(isSpotlightLive(diwali, new Date('2026-11-07T23:59:00+05:30'))).toBe(false);
    expect(isSpotlightLive(diwali, new Date('2026-11-09T00:00:00+05:30'))).toBe(false);
    expect(isSpotlightLive(diwali, new Date('2026-11-13T12:00:00+05:30'))).toBe(false);
  });

  it('treats an empty start or end as no limit', () => {
    expect(isSpotlightLive({}, new Date())).toBe(true);
    expect(isSpotlightLive({ startDate: null, endDate: diwali.endDate }, new Date('2026-01-01T00:00:00Z'))).toBe(true);
    expect(isSpotlightLive({ startDate: diwali.startDate, endDate: null }, new Date('2030-01-01T00:00:00Z'))).toBe(true);
  });
});

describe('India-time inputs', () => {
  it('stores a typed IST time as the exact instant', () => {
    expect(istInputToIso('2026-11-08T00:00')).toBe('2026-11-07T18:30:00.000Z');
    expect(istInputToIso('')).toBeNull();
    expect(istInputToIso('not a date')).toBeNull();
  });

  it('shows a stored instant back in IST', () => {
    expect(isoToIstInput('2026-11-07T18:30:00.000Z')).toBe('2026-11-08T00:00');
    expect(isoToIstInput(null)).toBe('');
    expect(isoToIstInput(istInputToIso('2027-01-14T06:15'))).toBe('2027-01-14T06:15');
  });
});

describe('spotlightPublishError', () => {
  const card = { label: 'Sun care', icon: 'sun' as const, title: 'Wear sunscreen', body: 'Reapply outdoors.' };
  const base = { templateType: 'spotlight', status: 'active', headline: 'Happy Pongal' };

  it('blocks going live with cards that are not doctor-checked', () => {
    expect(spotlightPublishError({ ...base, spotlight: { cards: [card], doctorReviewed: false } })).toMatch(/doctor/);
  });

  it('allows doctor-checked cards, a greeting with no cards, and drafts', () => {
    expect(spotlightPublishError({ ...base, spotlight: { cards: [card], doctorReviewed: true } })).toBeNull();
    expect(spotlightPublishError({ ...base, spotlight: { cards: [] } })).toBeNull();
    expect(spotlightPublishError({ ...base, status: 'draft', spotlight: { cards: [card] } })).toBeNull();
  });

  it('needs a heading and at most six cards', () => {
    expect(spotlightPublishError({ ...base, headline: '  ', spotlight: { cards: [] } })).toMatch(/heading/);
    expect(spotlightPublishError({ ...base, spotlight: { cards: Array(7).fill(card), doctorReviewed: true } })).toMatch(/6/);
  });

  it('ignores every other banner type', () => {
    expect(spotlightPublishError({ templateType: 'offer', status: 'active', headline: '' })).toBeNull();
  });
});

describe('themes', () => {
  it('defines every theme with at least one card tone', () => {
    for (const t of SPOTLIGHT_THEMES) expect(SPOTLIGHT_THEME_DEFS[t].tones.length).toBeGreaterThan(0);
  });

  it('falls back to Diwali for an unknown theme', () => {
    expect(getSpotlightTheme('nope')).toBe(SPOTLIGHT_THEME_DEFS.diwali);
  });
});
