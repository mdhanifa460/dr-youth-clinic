import { describe, it, expect } from 'vitest';

// Promo discount calculation — mirrors booking flow logic
function applyPromoDiscount(price: number, discountPct: number): number {
  if (discountPct <= 0 || discountPct > 100) return price;
  return Math.round(price * (1 - discountPct / 100));
}

function isValidPromoCode(code: string): boolean {
  return typeof code === 'string' && code.trim().length >= 3;
}

describe('Promo code discount logic', () => {
  it('applies percentage discount correctly', () => {
    expect(applyPromoDiscount(10000, 20)).toBe(8000);
  });

  it('applies 50% discount', () => {
    expect(applyPromoDiscount(5000, 50)).toBe(2500);
  });

  it('returns original price when discount is 0', () => {
    expect(applyPromoDiscount(5000, 0)).toBe(5000);
  });

  it('returns original price for invalid discount > 100', () => {
    expect(applyPromoDiscount(5000, 110)).toBe(5000);
  });

  it('handles decimal discounts by rounding', () => {
    expect(applyPromoDiscount(1000, 33)).toBe(670);
  });

  it('validates promo code minimum length', () => {
    expect(isValidPromoCode('AB')).toBe(false);
    expect(isValidPromoCode('ABC')).toBe(true);
    expect(isValidPromoCode('WELCOME10')).toBe(true);
  });

  it('rejects empty or whitespace codes', () => {
    expect(isValidPromoCode('')).toBe(false);
    expect(isValidPromoCode('   ')).toBe(false);
  });
});
