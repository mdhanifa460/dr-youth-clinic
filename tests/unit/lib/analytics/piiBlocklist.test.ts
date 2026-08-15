import { describe, it, expect } from 'vitest';
import { validateParamName, validateParamNames } from '@/app/lib/analytics/piiBlocklist';

describe('validateParamName', () => {
  it('rejects exact blocked names', () => {
    expect(validateParamName('name').valid).toBe(false);
    expect(validateParamName('phone').valid).toBe(false);
    expect(validateParamName('email').valid).toBe(false);
    expect(validateParamName('medical_history').valid).toBe(false);
    expect(validateParamName('diagnosis').valid).toBe(false);
  });

  it('rejects case variants', () => {
    expect(validateParamName('Patient_Name').valid).toBe(false);
    expect(validateParamName('EMAIL').valid).toBe(false);
    expect(validateParamName('PhoneNumber').valid).toBe(false);
  });

  it('rejects separator variants (underscore/hyphen/space insensitive)', () => {
    expect(validateParamName('patient-name').valid).toBe(false);
    expect(validateParamName('patient name').valid).toBe(false);
    expect(validateParamName('patientname').valid).toBe(false);
    expect(validateParamName('phone_number').valid).toBe(false);
  });

  it('gives a clear reason naming the field on rejection', () => {
    const result = validateParamName('email');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('email');
  });

  it('allows safe, non-identifying param names', () => {
    expect(validateParamName('service').valid).toBe(true);
    expect(validateParamName('branch').valid).toBe(true);
    expect(validateParamName('offer_id').valid).toBe(true);
    expect(validateParamName('source').valid).toBe(true);
    expect(validateParamName('campaign').valid).toBe(true);
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(validateParamName('').valid).toBe(false);
    expect(validateParamName('   ').valid).toBe(false);
  });
});

describe('validateParamNames', () => {
  it('returns null when every name is clean', () => {
    expect(validateParamNames(['service', 'branch', 'offer_id'])).toBeNull();
  });

  it('returns the first violation found', () => {
    const result = validateParamNames(['service', 'phone', 'email']);
    expect(result).not.toBeNull();
    expect(result?.reason).toContain('phone');
  });

  it('handles an empty array', () => {
    expect(validateParamNames([])).toBeNull();
  });
});
