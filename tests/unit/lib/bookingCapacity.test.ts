import { describe, it, expect } from 'vitest';
import { isRealAppointment } from '@/app/lib/bookingCapacity';

describe('isRealAppointment — Lead vs. capacity-consuming Appointment', () => {
  it('a genuinely chosen date + time is a real appointment', () => {
    expect(isRealAppointment('2026-09-01', '10:00 AM')).toBe(true);
  });

  it('missing date is not a real appointment', () => {
    expect(isRealAppointment(undefined, '10:00 AM')).toBe(false);
    expect(isRealAppointment('', '10:00 AM')).toBe(false);
  });

  it('missing time is not a real appointment', () => {
    expect(isRealAppointment('2026-09-01', undefined)).toBe(false);
    expect(isRealAppointment('2026-09-01', '')).toBe(false);
  });

  it('the "To be scheduled" placeholder (app/api/booking/route.ts\'s own fallback for a callback request with no slot step) is NOT a real appointment, even though both strings are non-empty', () => {
    expect(isRealAppointment('To be scheduled', 'To be scheduled')).toBe(false);
  });

  it('one field being the placeholder is enough to disqualify it', () => {
    expect(isRealAppointment('To be scheduled', '10:00 AM')).toBe(false);
    expect(isRealAppointment('2026-09-01', 'To be scheduled')).toBe(false);
  });

  it('null is treated the same as missing', () => {
    expect(isRealAppointment(null, null)).toBe(false);
  });
});
