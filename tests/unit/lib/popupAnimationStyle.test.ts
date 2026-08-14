import { describe, it, expect } from 'vitest';
import { splashAnimationStyleToClassName } from '@/app/components/banners/shared/PopupEntranceEffect';
import { SPLASH_ANIMATION_STYLES } from '@/app/lib/banners/popupOptions';

describe('splashAnimationStyleToClassName', () => {
  it('maps each CSS-driven style to its matching popup-fx- className', () => {
    expect(splashAnimationStyleToClassName('sparkle', false)).toBe('popup-fx-sparkle');
    expect(splashAnimationStyleToClassName('golden-glow', false)).toBe('popup-fx-golden-glow');
    expect(splashAnimationStyleToClassName('confetti', false)).toBe('popup-fx-confetti');
    expect(splashAnimationStyleToClassName('soft-particles', false)).toBe('popup-fx-soft-particles');
  });

  it('returns null for "none"', () => {
    expect(splashAnimationStyleToClassName('none', false)).toBeNull();
  });

  it('returns null for "lottie" (handled by LottiePlayer, not a CSS class)', () => {
    expect(splashAnimationStyleToClassName('lottie', false)).toBeNull();
  });

  it('returns null for every style when reduced motion is on, overriding the admin config', () => {
    for (const style of SPLASH_ANIMATION_STYLES) {
      expect(splashAnimationStyleToClassName(style, true)).toBeNull();
    }
  });
});
