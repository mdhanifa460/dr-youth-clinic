import { describe, it, expect } from 'vitest';

// Validates booking request shape — mirrors validation in api/booking/route.ts
function validateBookingRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body.name || body.name.trim().length < 2) errors.push('name is required (min 2 chars)');
  if (!body.phone || !/^\+?[\d\s\-()]{7,15}$/.test(body.phone)) errors.push('valid phone number is required');
  if (!body.service || body.service.trim().length === 0) errors.push('service is required');
  if (!body.location || body.location.trim().length === 0) errors.push('location is required');
  if (!body.date) errors.push('date is required');
  if (!body.time) errors.push('time is required');

  return { valid: errors.length === 0, errors };
}

const validBooking = {
  name: 'Priya Sharma',
  phone: '9876543210',
  service: 'Laser Hair Removal',
  location: 'Chennai',
  date: '2026-07-15',
  time: '10:00 AM',
};

describe('Booking request validation', () => {
  it('accepts a valid booking', () => {
    const result = validateBookingRequest(validBooking);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects missing name', () => {
    const result = validateBookingRequest({ ...validBooking, name: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('name is required (min 2 chars)');
  });

  it('rejects single-character name', () => {
    const result = validateBookingRequest({ ...validBooking, name: 'A' });
    expect(result.valid).toBe(false);
  });

  it('rejects missing service', () => {
    const result = validateBookingRequest({ ...validBooking, service: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('service is required');
  });

  it('rejects missing phone', () => {
    const result = validateBookingRequest({ ...validBooking, phone: '' });
    expect(result.valid).toBe(false);
  });

  it('rejects missing date', () => {
    const result = validateBookingRequest({ ...validBooking, date: '' });
    expect(result.valid).toBe(false);
  });

  it('rejects missing time', () => {
    const result = validateBookingRequest({ ...validBooking, time: '' });
    expect(result.valid).toBe(false);
  });

  it('accumulates multiple errors', () => {
    const result = validateBookingRequest({ name: '', phone: '', service: '' });
    expect(result.errors.length).toBeGreaterThan(2);
  });

  it('accepts phone with country code', () => {
    const result = validateBookingRequest({ ...validBooking, phone: '+919876543210' });
    expect(result.valid).toBe(true);
  });
});
