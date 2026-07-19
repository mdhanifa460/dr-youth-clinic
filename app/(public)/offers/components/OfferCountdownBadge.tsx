'use client';

import { useEffect, useState } from 'react';

// Extracted from app/components/lp/sections/OfferBannerSection.tsx's
// useCountdown hook — same tick logic, reused rather than reimplemented.
function useCountdown(expiry?: string) {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    if (!expiry) return;
    const target = new Date(expiry).getTime();

    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiry]);

  return timeLeft;
}

const pad = (n: number) => String(n).padStart(2, '0');

// Only ever rendered against a real, already-persisted validUntil value —
// never fabricated. Deliberately silent (renders null) outside the final 7
// days before expiry, so a live ticking countdown doesn't appear on offers
// that are still months out (that would read as manufactured urgency).
export default function OfferCountdownBadge({ validUntil }: { validUntil?: string }) {
  const countdown = useCountdown(validUntil);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!validUntil) return null;
  const target = new Date(validUntil);
  const isValid = !isNaN(target.getTime()) && target > new Date();
  if (!isValid || !mounted || countdown.d > 7) return null;

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">
      ⏰ {countdown.d}d {pad(countdown.h)}h {pad(countdown.m)}m left
    </span>
  );
}
