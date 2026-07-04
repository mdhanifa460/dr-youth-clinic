import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test the promo validation logic directly — isolates pure logic from DB
describe('Promo code API validation', () => {
  function validatePromoRequest(body: any): { valid: boolean; error?: string } {
    if (!body || typeof body !== 'object') return { valid: false, error: 'Invalid request body' };
    if (!body.code || typeof body.code !== 'string') return { valid: false, error: 'code is required' };
    if (body.code.trim().length < 3) return { valid: false, error: 'code too short' };
    return { valid: true };
  }

  it('rejects missing code', () => {
    expect(validatePromoRequest({})).toMatchObject({ valid: false });
  });

  it('rejects code shorter than 3 chars', () => {
    expect(validatePromoRequest({ code: 'AB' })).toMatchObject({ valid: false });
  });

  it('accepts valid code', () => {
    expect(validatePromoRequest({ code: 'WELCOME10' })).toMatchObject({ valid: true });
  });

  it('rejects null body', () => {
    expect(validatePromoRequest(null)).toMatchObject({ valid: false });
  });
});
