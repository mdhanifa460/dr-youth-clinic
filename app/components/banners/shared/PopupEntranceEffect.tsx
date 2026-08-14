"use client";

import LottiePlayer from "./LottiePlayer";
import type { SplashAnimationStyle } from "@/app/lib/banners/popupOptions";

// One-shot decorative layer for the Flash Offer Popup's entrance — never
// the popup's actual content, so always aria-hidden. Sparkle/glow/
// confetti/soft-particles are pure CSS (globals.css, "popup-fx-*" +
// "popupSparkleItem"/etc. keyframes below); Lottie reuses LottiePlayer.tsx
// verbatim (already lazy-loads lottie-react on mount, no changes needed).
// Renders nothing for 'none' or when the visitor has prefers-reduced-motion
// on — reduced-motion always wins over whatever an admin configured, same
// rule the Experience Engine already follows for glass-hero banners.

const ITEM_COUNTS: Partial<Record<SplashAnimationStyle, number>> = {
  sparkle: 6,
  confetti: 8,
  "soft-particles": 5,
};

// Extracted as a standalone pure function so the style→className mapping
// (including the reduced-motion override) is unit-testable without
// rendering anything.
export function splashAnimationStyleToClassName(
  style: SplashAnimationStyle,
  reduced: boolean
): string | null {
  if (reduced || style === "none" || style === "lottie") return null;
  return `popup-fx-${style}`;
}

export default function PopupEntranceEffect({
  style,
  lottieUrl,
  reduced,
}: {
  style: SplashAnimationStyle;
  lottieUrl?: string;
  reduced: boolean;
}) {
  if (reduced || style === "none") return null;

  if (style === "lottie") {
    if (!lottieUrl) return null;
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <LottiePlayer url={lottieUrl} className="w-full h-full" />
      </div>
    );
  }

  const className = splashAnimationStyleToClassName(style, reduced);
  if (!className) return null;

  const itemCount = ITEM_COUNTS[style] ?? 0;

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {Array.from({ length: itemCount }, (_, i) => (
        <span key={i} className="popup-fx-item" />
      ))}
    </div>
  );
}
