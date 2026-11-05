import { describe, it, expect } from 'vitest';
import { slotsForDate } from '@/app/lib/bookingSlots';
import { toTelHref } from '@/app/lib/phone';
import { toOpeningHoursSpec } from '@/app/components/SchemaMarkup';

const CHENNAI = [
  { day: 'Monday - Saturday', hours: '9:00 AM - 7:00 PM' },
  { day: 'Sunday', hours: 'Closed' },
];
const BANGALORE = [
  { day: 'Monday - Saturday', hours: '10:00 AM - 6:00 PM' },
  { day: 'Sunday', hours: 'Closed' },
];

describe('slotsForDate', () => {
  it('stays inside the branch hours', () => {
    const chennai = slotsForDate('2026-11-09', CHENNAI); // a Monday
    expect(chennai[0]).toBe('09:00 AM');
    expect(chennai.at(-1)).toBe('06:00 PM');

    const bangalore = slotsForDate('2026-11-09', BANGALORE);
    expect(bangalore[0]).toBe('10:00 AM');
    expect(bangalore.at(-1)).toBe('05:00 PM');
  });

  it('offers nothing on a closed day or a bad date', () => {
    expect(slotsForDate('2026-11-08', CHENNAI)).toEqual([]); // a Sunday
    expect(slotsForDate('not-a-date', CHENNAI)).toEqual([]);
  });
});

describe('toTelHref', () => {
  it('removes spaces and handles empty numbers', () => {
    expect(toTelHref('99944 49535')).toBe('tel:9994449535');
    expect(toTelHref('tel:99944 49535')).toBe('tel:9994449535');
    expect(toTelHref('+91 90433 02224')).toBe('tel:+919043302224');
    expect(toTelHref('')).toBe('');
    expect(toTelHref(undefined)).toBe('');
  });
});

describe('toOpeningHoursSpec', () => {
  it('reflects each branch and leaves out closed days', () => {
    expect(toOpeningHoursSpec(BANGALORE)).toEqual([{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '10:00',
      closes: '18:00',
    }]);
  });
});
