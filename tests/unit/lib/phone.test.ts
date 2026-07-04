import { describe, it, expect } from 'vitest';

// Mirrors formatPhone() used in booking/route.ts for WhatsApp delivery
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

describe('Phone number formatting for WhatsApp', () => {
  it('formats a 10-digit Indian number', () => {
    expect(formatPhone('9876543210')).toBe('919876543210');
  });

  it('keeps already-prefixed 91 numbers intact', () => {
    expect(formatPhone('919876543210')).toBe('919876543210');
  });

  it('strips spaces and dashes', () => {
    expect(formatPhone('+91 98765-43210')).toBe('919876543210');
  });

  it('strips +91 prefix correctly', () => {
    expect(formatPhone('+919876543210')).toBe('919876543210');
  });

  it('handles numbers with brackets', () => {
    expect(formatPhone('(98) 76543210')).toBe('919876543210');
  });
});
