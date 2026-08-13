import { describe, it, expect } from 'vitest';
import {
  matchAvailabilityCandidate,
  matchClinicInfoCandidate,
  isTreatmentListingCandidate,
  formatTime12h,
} from '@/app/lib/ai/simpleIntents';

// Fixed reference point: Thursday, 2026-08-13 10:00 local — matches
// tests/unit/lib/parseDateTime.test.ts's NOW so date math agrees.
const NOW = new Date(2026, 7, 13, 10, 0, 0);

describe('matchAvailabilityCandidate', () => {
  it('matches "check 11am availability" and assumes today', () => {
    expect(matchAvailabilityCandidate('check 11am availability', 'chennai', NOW)).toEqual({ date: '2026-08-13', time: '11:00' });
  });

  it('matches an explicit date + time + availability word', () => {
    expect(matchAvailabilityCandidate('is tomorrow 5pm slot free', 'chennai', NOW)).toEqual({ date: '2026-08-14', time: '17:00' });
  });

  it('returns null with no resolved location', () => {
    expect(matchAvailabilityCandidate('check 11am availability', null, NOW)).toBeNull();
  });

  it('returns null with a time but no availability word', () => {
    // Reads as a statement, not a question — should fall through to AI.
    expect(matchAvailabilityCandidate('I came in at 11am yesterday', 'chennai', NOW)).toBeNull();
  });

  it('returns null with an availability word but no parseable time', () => {
    expect(matchAvailabilityCandidate('are you open today', 'chennai', NOW)).toBeNull();
  });

  it('returns null for a long message even if it contains a time and keyword', () => {
    const long = 'I had laser hair removal last month and now at 11am I noticed some redness, is that normal or should I book an available slot to get it checked';
    expect(matchAvailabilityCandidate(long, 'chennai', NOW)).toBeNull();
  });

  it('returns null for a fully unrelated message', () => {
    expect(matchAvailabilityCandidate('what treatments do you offer', 'chennai', NOW)).toBeNull();
  });
});

describe('matchClinicInfoCandidate', () => {
  it('matches "Show Chennai clinic"', () => {
    expect(matchClinicInfoCandidate('Show Chennai clinic')).toBe('chennai');
  });

  it('matches a city name via its display name, not just the slug', () => {
    expect(matchClinicInfoCandidate('Bangalore branch address')).toBe('bangalore');
  });

  it('matches "Where is your Kochi centre"', () => {
    expect(matchClinicInfoCandidate('Where is your Kochi centre')).toBe('kochi');
  });

  it('returns null with a city name but no clinic/branch word', () => {
    expect(matchClinicInfoCandidate('I live in Chennai')).toBeNull();
  });

  it('returns null with a clinic word but no recognized city', () => {
    expect(matchClinicInfoCandidate('show me the clinic')).toBeNull();
  });

  it('returns null when the clinic mention is buried in a longer question', () => {
    const long = 'I am coming to your Chennai clinic next week for laser hair removal, does it hurt a lot and how many sessions will I need';
    expect(matchClinicInfoCandidate(long)).toBeNull();
  });
});

describe('isTreatmentListingCandidate', () => {
  it('matches "List treatments"', () => {
    expect(isTreatmentListingCandidate('List treatments')).toBe(true);
  });

  it('matches "What treatments do you offer"', () => {
    expect(isTreatmentListingCandidate('What treatments do you offer')).toBe(true);
  });

  it('matches "What services do you have"', () => {
    expect(isTreatmentListingCandidate('What services do you have')).toBe(true);
  });

  it('rejects a message naming a specific concern ("for")', () => {
    expect(isTreatmentListingCandidate('What treatments do you offer for acne scars')).toBe(false);
  });

  it('rejects a message asking for a recommendation', () => {
    expect(isTreatmentListingCandidate('What treatment do you recommend for me')).toBe(false);
  });

  it('rejects a message describing pain/symptoms', () => {
    expect(isTreatmentListingCandidate('What treatments help with hurt and scar')).toBe(false);
  });

  it('rejects an unrelated message', () => {
    expect(isTreatmentListingCandidate('is tomorrow 5pm available')).toBe(false);
  });

  it('rejects a long message even if it starts with the right shape', () => {
    const long = 'What treatments do you offer that would work well for someone with really sensitive combination skin';
    expect(isTreatmentListingCandidate(long)).toBe(false);
  });
});

describe('formatTime12h', () => {
  it('formats a whole hour with no minutes', () => {
    expect(formatTime12h('11:00')).toBe('11 AM');
  });
  it('formats an afternoon hour as PM', () => {
    expect(formatTime12h('17:00')).toBe('5 PM');
  });
  it('formats noon correctly', () => {
    expect(formatTime12h('12:00')).toBe('12 PM');
  });
  it('formats midnight correctly', () => {
    expect(formatTime12h('00:00')).toBe('12 AM');
  });
  it('keeps non-zero minutes', () => {
    expect(formatTime12h('11:30')).toBe('11:30 AM');
  });
});
