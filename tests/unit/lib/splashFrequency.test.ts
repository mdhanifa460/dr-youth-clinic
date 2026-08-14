import { describe, it, expect, beforeEach, vi } from 'vitest';
import { shouldShowSplash, markSplashShown } from '@/app/lib/banners/splashFrequency';

// This Node version's built-in experimental `localStorage`/`sessionStorage`
// globals shadow jsdom's own implementation (they exist but throw/are
// unusable without a --localstorage-file flag Vitest doesn't set), so
// window.localStorage isn't real Storage here even under environment:
// 'jsdom'. Stub both with a minimal in-memory Storage-like mock instead of
// depending on the environment to provide one — also makes the "storage
// unavailable" test below trivial to simulate precisely.
function createStorageMock(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  } as Storage;
}

let sessionMock: Storage;
let localMock: Storage;

beforeEach(() => {
  sessionMock = createStorageMock();
  localMock = createStorageMock();
  vi.stubGlobal('sessionStorage', sessionMock);
  vi.stubGlobal('localStorage', localMock);
});

describe('splashFrequency', () => {
  describe('every-session', () => {
    it('always shows, regardless of prior markSplashShown calls', () => {
      markSplashShown('banner-1', 'every-session');
      expect(shouldShowSplash('banner-1', 'every-session')).toBe(true);
    });

    it('never writes to either storage', () => {
      markSplashShown('banner-1', 'every-session');
      expect(sessionMock.length).toBe(0);
      expect(localMock.length).toBe(0);
    });
  });

  describe('once-per-session', () => {
    it('shows the first time, not shown again after markSplashShown for the same banner', () => {
      expect(shouldShowSplash('banner-1', 'once-per-session')).toBe(true);
      markSplashShown('banner-1', 'once-per-session');
      expect(shouldShowSplash('banner-1', 'once-per-session')).toBe(false);
    });

    it('still shows a different banner id after one was marked shown', () => {
      markSplashShown('banner-1', 'once-per-session');
      expect(shouldShowSplash('banner-2', 'once-per-session')).toBe(true);
    });

    it('uses the original splash key/shape so pre-existing sessions are unaffected', () => {
      markSplashShown('banner-1', 'once-per-session');
      expect(sessionMock.getItem('offer_splash_shown')).toBe('banner-1');
    });
  });

  describe('once-per-day', () => {
    it('shows the first time, not shown again the same day for the same banner', () => {
      const now = new Date('2026-08-15T10:00:00Z');
      expect(shouldShowSplash('banner-1', 'once-per-day', now)).toBe(true);
      markSplashShown('banner-1', 'once-per-day', now);
      expect(shouldShowSplash('banner-1', 'once-per-day', now)).toBe(false);
    });

    it('shows again once the date rolls over', () => {
      const day1 = new Date('2026-08-15T23:50:00Z');
      const day2 = new Date('2026-08-16T00:10:00Z');
      markSplashShown('banner-1', 'once-per-day', day1);
      expect(shouldShowSplash('banner-1', 'once-per-day', day2)).toBe(true);
    });

    it('still shows a different banner id on the same day', () => {
      const now = new Date('2026-08-15T10:00:00Z');
      markSplashShown('banner-1', 'once-per-day', now);
      expect(shouldShowSplash('banner-2', 'once-per-day', now)).toBe(true);
    });

    it('does not touch sessionStorage', () => {
      const now = new Date('2026-08-15T10:00:00Z');
      markSplashShown('banner-1', 'once-per-day', now);
      expect(sessionMock.length).toBe(0);
    });
  });

  describe('storage-unavailable fallback', () => {
    it('falls through to "show it anyway" when sessionStorage throws', () => {
      vi.stubGlobal('sessionStorage', {
        get getItem() { throw new Error('blocked'); },
        get setItem() { throw new Error('blocked'); },
      });
      expect(shouldShowSplash('banner-1', 'once-per-session')).toBe(true);
      expect(() => markSplashShown('banner-1', 'once-per-session')).not.toThrow();
    });
  });
});
