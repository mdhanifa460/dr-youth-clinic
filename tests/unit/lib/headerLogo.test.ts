import { describe, it, expect } from 'vitest';
import { toHeaderLogo } from '@/app/lib/headerLogo';

describe('toHeaderLogo', () => {
  it('crops the saved brand logo to the icon', () => {
    expect(toHeaderLogo('https://res.cloudinary.com/x/image/upload/v1/dr-youth-clinic/branding/iuuh9ypj8v4vel6l7kd1.png'))
      .toBe('https://res.cloudinary.com/x/image/upload/c_crop,x_300,y_355,w_460,h_445/v1/dr-youth-clinic/branding/iuuh9ypj8v4vel6l7kd1.png');
  });

  it('leaves any other logo untouched', () => {
    const other = 'https://res.cloudinary.com/x/image/upload/v2/dr-youth-clinic/branding/new-logo.png';
    expect(toHeaderLogo(other)).toBe(other);
    expect(toHeaderLogo('/logo.png')).toBe('/logo.png');
  });
});
