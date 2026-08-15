import { describe, it, expect } from 'vitest';
import { resolveCustomEventParams } from '@/app/lib/analytics/resolveCustomEventParams';

describe('resolveCustomEventParams', () => {
  it('passes static values through literally', () => {
    const result = resolveCustomEventParams(
      [{ name: 'branch', source: 'static', value: 'chennai' }],
      null
    );
    expect(result).toEqual({ branch: 'chennai' });
  });

  it('reads a dataAttribute value from the element dataset', () => {
    const element = { dataset: { offerId: 'diwali-2026' } };
    const result = resolveCustomEventParams(
      [{ name: 'offer_id', source: 'dataAttribute', value: 'offerId' }],
      element
    );
    expect(result).toEqual({ offer_id: 'diwali-2026' });
  });

  it('falls back to an empty string when the data attribute is missing, without throwing', () => {
    const element = { dataset: {} };
    expect(() =>
      resolveCustomEventParams([{ name: 'offer_id', source: 'dataAttribute', value: 'offerId' }], element)
    ).not.toThrow();
    const result = resolveCustomEventParams(
      [{ name: 'offer_id', source: 'dataAttribute', value: 'offerId' }],
      element
    );
    expect(result).toEqual({ offer_id: '' });
  });

  it('handles a null element for dataAttribute params without throwing', () => {
    expect(() =>
      resolveCustomEventParams([{ name: 'offer_id', source: 'dataAttribute', value: 'offerId' }], null)
    ).not.toThrow();
    const result = resolveCustomEventParams([{ name: 'offer_id', source: 'dataAttribute', value: 'offerId' }], null);
    expect(result).toEqual({ offer_id: '' });
  });

  it('resolves multiple mixed-source parameters together', () => {
    const element = { dataset: { service: 'hair-transplant' } };
    const result = resolveCustomEventParams(
      [
        { name: 'branch', source: 'static', value: 'chennai' },
        { name: 'service', source: 'dataAttribute', value: 'service' },
      ],
      element
    );
    expect(result).toEqual({ branch: 'chennai', service: 'hair-transplant' });
  });

  it('skips a parameter with no name', () => {
    const result = resolveCustomEventParams([{ name: '', source: 'static', value: 'x' }], null);
    expect(result).toEqual({});
  });

  it('handles an empty/undefined parameters array', () => {
    expect(resolveCustomEventParams([], null)).toEqual({});
    expect(resolveCustomEventParams(undefined, null)).toEqual({});
  });
});
