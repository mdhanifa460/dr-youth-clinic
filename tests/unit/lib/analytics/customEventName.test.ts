import { describe, it, expect } from 'vitest';
import { validateCustomEventName } from '@/app/lib/analytics/validateCustomEventName';
import { PREDEFINED_EVENTS } from '@/app/lib/analytics/eventRegistry';

describe('validateCustomEventName', () => {
  it('accepts a well-formed lowercase_snake_case name', () => {
    expect(validateCustomEventName('campaign_banner_click').valid).toBe(true);
    expect(validateCustomEventName('new_promotion_click').valid).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(validateCustomEventName('').valid).toBe(false);
    expect(validateCustomEventName('   ').valid).toBe(false);
  });

  it('rejects names starting with a digit or underscore', () => {
    expect(validateCustomEventName('1st_click').valid).toBe(false);
    expect(validateCustomEventName('_click').valid).toBe(false);
  });

  it('rejects uppercase, spaces, and hyphens', () => {
    expect(validateCustomEventName('CampaignClick').valid).toBe(false);
    expect(validateCustomEventName('campaign click').valid).toBe(false);
    expect(validateCustomEventName('campaign-click').valid).toBe(false);
  });

  it('rejects collision with every real predefined event name', () => {
    for (const ev of PREDEFINED_EVENTS) {
      const result = validateCustomEventName(ev.name);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain(ev.name);
    }
  });

  it('gives a clear, specific reason on every rejection', () => {
    expect(validateCustomEventName('booking_confirmed').reason).toMatch(/predefined event name/);
    expect(validateCustomEventName('Bad Name').reason).toMatch(/lowercase_snake_case/);
  });
});
