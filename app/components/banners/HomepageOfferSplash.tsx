'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { BannerDoc } from '@/app/lib/banners/types';
import CTAButton from '@/app/components/banners/shared/CTAButton';
import BannerHeroImage from '@/app/components/banners/shared/BannerHeroImage';

const SESSION_KEY = 'offer_splash_shown';

// Auto-dismissing modal splash for a homepage offer — separate from that
// same banner's normal inline placement (BannerCarousel/BannerRenderer
// above); this is the "announce it the moment the page loads" treatment,
// only for banners an admin has explicitly opted into via Banner →
// splashEnabled (Admin → Banners → Where to Show), never automatic for
// every homepage banner.
//
// Shown at most once per browser session (sessionStorage-gated) — an offer
// popup on every single page load/navigation would be the kind of
// obnoxious pattern this feature should specifically avoid, not create.
export default function HomepageOfferSplash({ banner }: { banner: (BannerDoc & { splashAutoCloseSeconds?: number }) | null }) {
  const [open, setOpen] = useState(false);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!banner) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === String(banner._id)) return;
    } catch {
      // sessionStorage unavailable (private mode, etc.) — fall through and
      // show it anyway rather than silently never showing the splash.
    }
    setOpen(true);
    setRemaining(Math.max(2, banner.splashAutoCloseSeconds || 5));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banner?._id]);

  useEffect(() => {
    if (!open) return;
    if (remaining <= 0) { close(); return; }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, remaining]);

  function close() {
    setOpen(false);
    if (banner) {
      try { sessionStorage.setItem(SESSION_KEY, String(banner._id)); } catch { /* ignore */ }
    }
  }

  if (!banner || !open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 animate-[fadeIn_0.25s_ease-out]"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-modal="true"
      aria-label={banner.headline || 'Special offer'}
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl animate-[scaleIn_0.25s_ease-out]">
        <button
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition"
        >
          <X size={18} />
        </button>

        {/* Auto-close countdown ring — a quiet, non-intrusive affordance
            rather than a bare number, so it reads as "closing soon" at a
            glance without competing with the offer content for attention. */}
        <svg className="absolute top-3 left-3 z-10 -rotate-90" width="28" height="28" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="11" fill="rgba(0,0,0,0.3)" />
          <circle
            cx="14" cy="14" r="11" fill="none" stroke="white" strokeWidth="2.5"
            strokeDasharray={2 * Math.PI * 11}
            strokeDashoffset={2 * Math.PI * 11 * (1 - remaining / Math.max(1, banner.splashAutoCloseSeconds || 5))}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>

        {banner.desktopImage?.url && (
          <BannerHeroImage
            desktopImage={banner.desktopImage}
            mobileImage={banner.mobileImage}
            alt={banner.headline || 'Special offer'}
            aspectRatio="4/3"
          />
        )}

        <div className="p-6 text-center space-y-2">
          {banner.subtitle && (
            <span className="inline-block text-[#F5A623] text-[11px] font-bold uppercase tracking-widest">{banner.subtitle}</span>
          )}
          <h2 className="text-xl font-headline font-extrabold text-[#0B2560] leading-snug whitespace-pre-line">{banner.headline}</h2>
          {banner.description && <p className="text-gray-500 text-sm">{banner.description}</p>}
          {banner.primaryCTA?.label && (
            <div className="pt-2" onClick={close}>
              <CTAButton label={banner.primaryCTA.label} href={banner.primaryCTA.href} variant="primary" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
