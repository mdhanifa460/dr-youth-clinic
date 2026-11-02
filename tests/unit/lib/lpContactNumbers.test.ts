import { describe, it, expect } from 'vitest';
import { toWhatsAppNumber } from '@/app/lib/phone';
import { withPageContactNumbers } from '@/app/lib/lpContactNumbers';

type Section = { type: string; data: any };

describe('toWhatsAppNumber', () => {
  it('adds the country code to a 10-digit number', () => {
    expect(toWhatsAppNumber('7200865777')).toBe('917200865777');
    expect(toWhatsAppNumber('72008 65777')).toBe('917200865777');
  });

  it('adds it to a mobile number that itself starts with 91', () => {
    expect(toWhatsAppNumber('9176543210')).toBe('919176543210');
  });

  it('leaves a number that already has a country code alone', () => {
    expect(toWhatsAppNumber('917200865777')).toBe('917200865777');
    expect(toWhatsAppNumber('+91 72008 65777')).toBe('917200865777');
  });

  it('strips a leading 0', () => {
    expect(toWhatsAppNumber('07200865777')).toBe('917200865777');
  });

  it('returns empty for empty input', () => {
    expect(toWhatsAppNumber('')).toBe('');
  });
});

describe('withPageContactNumbers', () => {
  it('makes CTA and form sections follow the hero', () => {
    const out = withPageContactNumbers<Section>([
      { type: 'hero', data: { phone: '7200865777', whatsapp: '7200865777' } },
      { type: 'cta', data: { phone: '9043302224', whatsapp: '9043302224', headline: 'Keep me' } },
      { type: 'form', data: { phone: '9043302224' } },
    ]);
    expect(out[1].data).toEqual({ phone: '7200865777', whatsapp: '7200865777', headline: 'Keep me' });
    expect(out[2].data.phone).toBe('7200865777');
  });

  it("keeps a section's own number when the hero has none", () => {
    const out = withPageContactNumbers<Section>([
      { type: 'hero', data: {} },
      { type: 'cta', data: { phone: '18008909669' } },
    ]);
    expect(out[1].data.phone).toBe('18008909669');
  });

  it('leaves other sections untouched', () => {
    const faq = { type: 'faq', data: { phone: 'x' } };
    expect(withPageContactNumbers<Section>([{ type: 'hero', data: { phone: '1' } }, faq])[1]).toBe(faq);
  });
});
