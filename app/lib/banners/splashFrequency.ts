// Flash Offer Popup display-frequency gating — extracted as pure,
// storage-agnostic-except-for-these-two-calls functions so the gating
// logic itself is unit-testable without React, and so
// HomepageOfferSplash.tsx's open-decision effect stays a thin call site.
//
// 'once-per-session' preserves the ORIGINAL splash's exact behavior byte
// for byte (same sessionStorage key, same value shape) — a banner with no
// splashFrequency set (schema default) behaves identically to before this
// file existed, zero migration needed.
import type { SplashFrequency } from "./popupOptions";

const SESSION_KEY = "offer_splash_shown";
const DAILY_KEY = "offer_splash_shown_daily";

function todayStamp(now: Date): string {
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Returns false only when we can positively confirm this banner was
// already shown under the current frequency rule. Any storage failure
// (private browsing, disabled storage, etc.) falls through to "show it
// anyway" — the same posture the original splash already had for
// sessionStorage throwing, applied consistently to the new localStorage
// path too.
export function shouldShowSplash(bannerId: string, frequency: SplashFrequency, now: Date = new Date()): boolean {
  if (frequency === "every-session") return true;

  try {
    if (frequency === "once-per-day") {
      const stored = window.localStorage.getItem(DAILY_KEY);
      if (!stored) return true;
      const [storedId, storedDate] = stored.split(":");
      return !(storedId === bannerId && storedDate === todayStamp(now));
    }
    // 'once-per-session' (default)
    return window.sessionStorage.getItem(SESSION_KEY) !== bannerId;
  } catch {
    return true;
  }
}

export function markSplashShown(bannerId: string, frequency: SplashFrequency, now: Date = new Date()): void {
  if (frequency === "every-session") return;

  try {
    if (frequency === "once-per-day") {
      window.localStorage.setItem(DAILY_KEY, `${bannerId}:${todayStamp(now)}`);
      return;
    }
    window.sessionStorage.setItem(SESSION_KEY, bannerId);
  } catch {
    // Storage unavailable — nothing to persist, next check will just fall
    // through to "show it anyway" again, same as above.
  }
}
