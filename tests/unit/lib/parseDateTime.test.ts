import { describe, it, expect } from 'vitest';
import { parseRelativeDate, parseTime, parseDateTime } from '@/app/lib/parseDateTime';

// Fixed reference point: Thursday, 2026-08-13 10:00 local.
const NOW = new Date(2026, 7, 13, 10, 0, 0);

describe('parseRelativeDate', () => {
  it('parses "today"', () => {
    expect(parseRelativeDate('today', NOW)).toBe('2026-08-13');
  });
  it('parses "tomorrow"', () => {
    expect(parseRelativeDate('tomorrow', NOW)).toBe('2026-08-14');
  });
  it('parses "day after tomorrow"', () => {
    expect(parseRelativeDate('day after tomorrow', NOW)).toBe('2026-08-15');
  });
  it('parses a bare weekday name as the next occurrence', () => {
    // 2026-08-13 is a Thursday; next Monday is 2026-08-17.
    expect(parseRelativeDate('monday', NOW)).toBe('2026-08-17');
  });
  it('parses "next <weekday>" as 7 days out when it is the same weekday as today', () => {
    expect(parseRelativeDate('next thursday', NOW)).toBe('2026-08-20');
  });
  it('returns null for text with no date signal', () => {
    expect(parseRelativeDate('how much is PRP', NOW)).toBeNull();
  });
});

describe('parseTime', () => {
  it('parses "11am"', () => {
    expect(parseTime('11am')).toBe('11:00');
  });
  it('parses "11 AM" with a space', () => {
    expect(parseTime('is 11 AM available')).toBe('11:00');
  });
  it('parses "5pm" and converts to 24-hour', () => {
    expect(parseTime('5pm')).toBe('17:00');
  });
  it('parses "11:30am"', () => {
    expect(parseTime('11:30am')).toBe('11:30');
  });
  it('parses unambiguous 24-hour-style "17:00" with no am/pm', () => {
    expect(parseTime('17:00')).toBe('17:00');
  });
  it('parses "12pm" as noon (not 24:00)', () => {
    expect(parseTime('12pm')).toBe('12:00');
  });
  it('parses "12am" as midnight', () => {
    expect(parseTime('12am')).toBe('00:00');
  });
  it('refuses to guess an ambiguous hour with no am/pm (e.g. "at 5")', () => {
    expect(parseTime('at 5')).toBeNull();
  });
  it('returns null for text with no time signal', () => {
    expect(parseTime('do you have hair treatment in chennai')).toBeNull();
  });
});

describe('parseDateTime', () => {
  it('parses a real combined phrase: "tomorrow 11 am dr availability"', () => {
    expect(parseDateTime('tomorrow 11 am dr availability', NOW)).toEqual({ date: '2026-08-14', time: '11:00' });
  });
  it('returns null when only a date is present (no specific time)', () => {
    expect(parseDateTime('is tomorrow open', NOW)).toBeNull();
  });
  it('returns null when only a time is present (no specific date)', () => {
    expect(parseDateTime('is 5pm available', NOW)).toBeNull();
  });
  it('returns null for a fully unrelated message', () => {
    expect(parseDateTime('what treatments do you offer', NOW)).toBeNull();
  });
});
