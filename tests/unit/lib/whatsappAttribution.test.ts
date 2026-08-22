import { describe, it, expect } from 'vitest';
import {
  encodeAttributionToken,
  decodeAttributionToken,
  extractAttributionTokenFromMessage,
  buildWaLink,
} from '@/app/lib/whatsappAttribution';

describe('encodeAttributionToken / decodeAttributionToken — round trip', () => {
  it('round-trips a full attribution payload (Google Ads → WhatsApp)', () => {
    const payload = { a: 'visitor-abc-123', s: 'google', m: 'cpc', c: 'hair_loss_chennai', ci: 'Cj0KCQjw', cit: 'gclid' };
    const token = encodeAttributionToken(payload);
    expect(token).toBeTruthy();
    expect(decodeAttributionToken(token)).toEqual(payload);
  });

  it('is URL-safe (no +, /, or = characters — safe to embed in a wa.me message)', () => {
    const token = encodeAttributionToken({ a: 'v1', s: 'google', c: 'a campaign with spaces & symbols/slash' });
    expect(token).not.toMatch(/[+/=]/);
  });

  it('omits empty/undefined fields rather than encoding them', () => {
    const token = encodeAttributionToken({ a: 'v1', s: '', m: undefined, c: 'X' });
    expect(decodeAttributionToken(token)).toEqual({ a: 'v1', c: 'X' });
  });

  it('returns an empty string (nothing to append) when the payload is entirely empty', () => {
    expect(encodeAttributionToken({})).toBe('');
  });

  it('decode returns null for empty/garbled/hand-edited tokens — never guesses', () => {
    expect(decodeAttributionToken('')).toBeNull();
    expect(decodeAttributionToken('not-valid-base64!!!')).toBeNull();
    expect(decodeAttributionToken('YWJjZGVm')).toBeNull(); // valid base64, but not our JSON shape
  });

  it('a token with one character removed (customer editing it) fails to decode, not silently degrades to a guess', () => {
    const token = encodeAttributionToken({ a: 'v1', s: 'google', c: 'hair_loss_chennai' });
    const tampered = token.slice(0, -3);
    expect(decodeAttributionToken(tampered)).toBeNull();
  });
});

describe('extractAttributionTokenFromMessage — recovering the token from an inbound WhatsApp message', () => {
  it('extracts the token from a normal message', () => {
    const token = encodeAttributionToken({ a: 'v1', s: 'google' });
    const text = `Hi, I'd like to book a free consultation\n\n(ref: ${token})`;
    expect(extractAttributionTokenFromMessage(text)).toBe(token);
  });

  it('returns null when the customer sends a message with no ref tag at all', () => {
    expect(extractAttributionTokenFromMessage('Hi, is the clinic open today?')).toBeNull();
  });

  it('returns null for an empty/undefined message', () => {
    expect(extractAttributionTokenFromMessage('')).toBeNull();
  });

  it('a modified ref tag is still "extracted" (the string is present) but decodeAttributionToken correctly rejects it', () => {
    const extracted = extractAttributionTokenFromMessage('Hi (ref: totally-made-up-token)');
    expect(extracted).toBe('totally-made-up-token');
    expect(decodeAttributionToken(extracted!)).toBeNull();
  });
});

describe('buildWaLink — the actual CTA href', () => {
  it('builds a plain wa.me link with the message, no attribution when none is given', () => {
    const href = buildWaLink('+91 98765 43210', 'Hi there');
    expect(href).toBe('https://wa.me/919876543210?text=' + encodeURIComponent('Hi there'));
  });

  it('appends the encoded token as a trailing line when attribution is provided', () => {
    const href = buildWaLink('9876543210', 'Hi there', { a: 'v1', s: 'google' });
    expect(href).toContain('wa.me/9876543210?text=');
    expect(decodeURIComponent(href.split('?text=')[1])).toMatch(/^Hi there\n\n\(ref: .+\)$/);
  });

  it('returns empty string for a number with no digits at all', () => {
    expect(buildWaLink('', 'Hi')).toBe('');
  });
});
