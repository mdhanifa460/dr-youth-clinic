import { describe, it, expect } from 'vitest';
import { getBranchLocalDateStr, secondsUntilNextLocalMidnight, addDaysToDateStr } from '@/app/lib/branchTimezone';

describe('getBranchLocalDateStr — branch-local "today", not UTC', () => {
  it('Chennai (Asia/Kolkata, UTC+5:30): a moment that is already tomorrow in IST but still today in UTC resolves to the IST date', () => {
    // 2026-08-24T20:00:00Z = 2026-08-25T01:30:00+05:30 — already the 25th in India.
    const at = new Date('2026-08-24T20:00:00.000Z');
    expect(getBranchLocalDateStr('Asia/Kolkata', at)).toBe('2026-08-25');
  });

  it('the same instant resolves to a different calendar date in a different timezone — not hardcoded to India', () => {
    const at = new Date('2026-08-24T20:00:00.000Z');
    expect(getBranchLocalDateStr('America/New_York', at)).toBe('2026-08-24'); // still the 24th in NY (UTC-4)
  });

  it('exactly at IST midnight, the new local date has already begun', () => {
    // 2026-08-24T18:30:00Z = 2026-08-25T00:00:00+05:30
    const at = new Date('2026-08-24T18:30:00.000Z');
    expect(getBranchLocalDateStr('Asia/Kolkata', at)).toBe('2026-08-25');
  });

  it('one second before IST midnight is still the previous local date', () => {
    // 2026-08-24T18:29:59Z = 2026-08-24T23:59:59+05:30
    const at = new Date('2026-08-24T18:29:59.000Z');
    expect(getBranchLocalDateStr('Asia/Kolkata', at)).toBe('2026-08-24');
  });
});

describe('secondsUntilNextLocalMidnight — the TTL a daily capacity counter must expire at', () => {
  it('exactly at local midnight, a full day remains', () => {
    const at = new Date('2026-08-24T18:30:00.000Z'); // 00:00:00 IST
    expect(secondsUntilNextLocalMidnight('Asia/Kolkata', at)).toBe(86400);
  });

  it('one hour into the local day, 23 hours remain', () => {
    const at = new Date('2026-08-24T19:30:00.000Z'); // 01:00:00 IST
    expect(secondsUntilNextLocalMidnight('Asia/Kolkata', at)).toBe(23 * 3600);
  });

  it('one second before local midnight, one second remains', () => {
    const at = new Date('2026-08-24T18:29:59.000Z'); // 23:59:59 IST (previous day)
    expect(secondsUntilNextLocalMidnight('Asia/Kolkata', at)).toBe(1);
  });

  it('always returns a positive value, never zero or negative (would make Redis EXPIRE a no-op)', () => {
    for (let h = 0; h < 24; h++) {
      const at = new Date(Date.UTC(2026, 7, 24, h, 30));
      expect(secondsUntilNextLocalMidnight('Asia/Kolkata', at)).toBeGreaterThan(0);
    }
  });
});

describe('addDaysToDateStr — pure calendar-date arithmetic', () => {
  it('adds days within the same month', () => {
    expect(addDaysToDateStr('2026-08-20', 5)).toBe('2026-08-25');
  });
  it('rolls over a month boundary', () => {
    expect(addDaysToDateStr('2026-08-28', 5)).toBe('2026-09-02');
  });
  it('rolls over a year boundary', () => {
    expect(addDaysToDateStr('2026-12-28', 5)).toBe('2027-01-02');
  });
  it('0 days returns the same date', () => {
    expect(addDaysToDateStr('2026-08-20', 0)).toBe('2026-08-20');
  });
});
