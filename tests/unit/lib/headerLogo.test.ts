import { describe, it, expect } from 'vitest';
import { toHeaderLogo } from '@/app/lib/headerLogo';

describe('toHeaderLogo', () => {
  it('trims the margins of a Cloudinary logo', () => {
    expect(toHeaderLogo('https://res.cloudinary.com/ddak6zizz/image/upload/v1789391626/dr-youth-clinic/branding/logo.png'))
      .toBe('https://res.cloudinary.com/ddak6zizz/image/upload/e_trim/v1789391626/dr-youth-clinic/branding/logo.png');
  });

  it('trims only once', () => {
    const trimmed = 'https://res.cloudinary.com/x/image/upload/e_trim/v1/logo.png';
    expect(toHeaderLogo(trimmed)).toBe(trimmed);
  });

  it('leaves other logos alone', () => {
    expect(toHeaderLogo('/images/logo.png')).toBe('/images/logo.png');
    expect(toHeaderLogo('https://example.com/image/upload/logo.png')).toBe('https://example.com/image/upload/logo.png');
  });
});
