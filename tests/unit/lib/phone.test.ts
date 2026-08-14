import { describe, it, expect } from 'vitest';
import { isValidIndianMobile } from '@/app/lib/phone';

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

describe('isValidIndianMobile', () => {
  it('accepts a plain 10-digit mobile number', () => {
    expect(isValidIndianMobile('9876543210')).toBe(true);
  });

  it('accepts a number with a leading +91', () => {
    expect(isValidIndianMobile('+919876543210')).toBe(true);
  });

  it('accepts a number with a leading 91 (no +)', () => {
    expect(isValidIndianMobile('919876543210')).toBe(true);
  });

  it('accepts a number with spaces/dashes', () => {
    expect(isValidIndianMobile('98765-43210')).toBe(true);
    expect(isValidIndianMobile('98765 43210')).toBe(true);
  });

  it('rejects fewer than 10 digits', () => {
    expect(isValidIndianMobile('987654321')).toBe(false);
  });

  // The bug this validator specifically closes: every previous ad-hoc check
  // in this codebase only enforced "at least 10 digits", so an 11+ digit
  // number silently passed as "valid".
  it('rejects more than 10 digits (not just "at least 10")', () => {
    expect(isValidIndianMobile('98765432101')).toBe(false);
    expect(isValidIndianMobile('123456789012')).toBe(false);
  });

  it('rejects a number starting with 0-5 (not a valid Indian mobile prefix)', () => {
    expect(isValidIndianMobile('1234567890')).toBe(false);
    expect(isValidIndianMobile('5876543210')).toBe(false);
  });

  it('rejects empty/garbled input', () => {
    expect(isValidIndianMobile('')).toBe(false);
    expect(isValidIndianMobile('abcdefghij')).toBe(false);
  });

  it('rejects a landline-shaped number with an 0-prefixed STD code', () => {
    expect(isValidIndianMobile('04412345678')).toBe(false);
  });
});
