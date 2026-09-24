'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Volume2, ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import type { BannerDoc } from '@/app/lib/banners/types';
import CTAButton from '@/app/components/banners/shared/CTAButton';
import PopupEntranceEffect from '@/app/components/banners/shared/PopupEntranceEffect';
import { usePrefersReducedMotion } from '@/app/components/banners/shared/ScrollMotion';
import { shouldShowSplash, markSplashShown } from '@/app/lib/banners/splashFrequency';
import { postBannerPopupEvent } from '@/app/lib/bannerPopupAnalytics';
import { playPopupSound } from '@/app/lib/banners/popupSound';
import { cloudImgFocal } from '@/app/lib/cloudinary-url';
import { focalPointToObjectPosition } from '@/app/lib/media/focalPoint';
import { isValidIndianMobile, INVALID_MOBILE_MESSAGE } from '@/app/lib/phone';
import { useIdempotencyKey } from '@/app/lib/useIdempotencyKey';
import { pushDataLayerEvent, trackBookingConversion } from '@/app/lib/trackConversion';

// Flash Offer Popup — auto-dismissing modal for a homepage offer, separate
// from that same banner's normal inline placement (BannerCarousel/
// BannerRenderer above). "Announce it the moment the page loads," only for
// banners an admin has explicitly opted into via Banner → splashEnabled
// (Admin → Banners → Where to Show), never automatic for every homepage
// banner.
//
// Display frequency (once per session / once per day / every session) is
// admin-configurable via splashFrequency — see splashFrequency.ts. Default
// remains "once per session," the original behavior.
//
// forcePreview (admin preview page only): always opens regardless of
// session/localStorage state, never writes to either storage on close (so
// previewing repeatedly never suppresses a real visitor's first view or
// gets suppressed by a prior real visit), and never logs analytics events
// — a preview open/close/CTA-click is not a real visitor interaction.
export default function HomepageOfferSplash({
  banner, forcePreview = false, page = 'homepage',
}: {
  banner: BannerDoc | null;
  forcePreview?: boolean;
  // Was hardcoded 'homepage' throughout — this component now also mounts
  // on location/service/category/landing pages (see resolveBanner.ts's new
  // "landing" slot and each page's own splash-mount call), so the caller
  // says which page it's actually on for accurate analytics.
  page?: string;
}) {
  const [open, setOpen] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<Element | null>(null);
  // Guards the view event against React StrictMode's dev-only double-
  // invoke of effects (mount→cleanup→mount) — never happens in a
  // production build, but without this a local dev session logs two
  // flash_offer_view rows per real page load.
  const viewTrackedForBannerId = useRef<string | null>(null);
  const reduced = usePrefersReducedMotion();

  // Inline Lead Form — see app/models/Banner.ts's formEnabled comment for
  // why this exists (submit right here, never navigate away).
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [formError, setFormError] = useState('');
  const getIdempotencyKey = useIdempotencyKey();

  // "Story View" swipeable slides — index into banner.storySlides, only
  // ever relevant when that array is non-empty (see the render logic
  // below; falls through to the existing single-image rendering otherwise).
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (!banner) return;
    if (!forcePreview && !shouldShowSplash(String(banner._id), banner.splashFrequency || 'once-per-session')) return;
    setOpen(true);
    setRemaining(Math.max(2, banner.splashAutoCloseSeconds || 5));
    if (!forcePreview && viewTrackedForBannerId.current !== String(banner._id)) {
      viewTrackedForBannerId.current = String(banner._id);
      postBannerPopupEvent('flash_offer_view', {
        bannerId: String(banner._id),
        offerName: banner.headline || '',
        page,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banner?._id, forcePreview]);

  useEffect(() => {
    if (!open) return;
    // A form asking for real name/phone shouldn't race a countdown that
    // could close the dialog out from under someone mid-typing — the whole
    // point of adding a form here is to capture a lead, not to rush one.
    // Auto-close is simply off for the lifetime of a form-enabled popup;
    // an admin who wants urgency uses the CTA-button popup instead.
    if (banner?.formEnabled) return;
    if (banner?.splashShowCountdown === false) return; // countdown hidden, but auto-close still applies via this same timer
    if (remaining <= 0) { close(); return; }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, remaining]);

  // ESC to close — only listens while open.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') trapFocus(e);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Minimal focus management — focus the close button on open (always
  // present, always keyboard-reachable), restore whatever was focused
  // beforehand on close.
  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement;
      closeBtnRef.current?.focus();
    } else if (previouslyFocused.current instanceof HTMLElement) {
      previouslyFocused.current.focus();
    }
  }, [open]);

  function trapFocus(e: KeyboardEvent) {
    const container = cardRef.current;
    if (!container) return;
    const focusable = container.querySelectorAll<HTMLElement>(
      'button, a[href], input, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function close() {
    setOpen(false);
    if (banner && !forcePreview) {
      markSplashShown(String(banner._id), banner.splashFrequency || 'once-per-session');
      postBannerPopupEvent('flash_offer_close', {
        bannerId: String(banner._id),
        offerName: banner.headline || '',
        page,
      });
    }
  }

  function handleCtaClick() {
    if (banner) {
      // A real click, same as the 🔊 toggle — safe to play sound here too.
      // Skipped under reduced motion, same combined "minimal experience"
      // rule the entrance effect follows. Sound stays testable in preview
      // (an admin clicking the preview CTA genuinely wants to hear it) —
      // only analytics is preview-suppressed.
      if (!reduced && banner.splashSound?.enabled && banner.splashSound.effect) {
        playPopupSound(banner.splashSound.effect);
      }
      if (!forcePreview) {
        postBannerPopupEvent('flash_offer_cta_click', {
          bannerId: String(banner._id),
          offerName: banner.headline || '',
          page,
        });
      }
    }
    close();
  }

  function handleSoundClick() {
    if (banner?.splashSound?.effect) playPopupSound(banner.splashSound.effect);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!banner) return;
    if (!isValidIndianMobile(form.phone)) {
      setFormError(INVALID_MOBILE_MESSAGE);
      setFormStatus('error');
      return;
    }
    setFormStatus('submitting');
    setFormError('');
    try {
      const res = await fetch('/api/banner-popup/lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': getIdempotencyKey({ bannerId: String(banner._id), form }),
        },
        body: JSON.stringify({ bannerId: String(banner._id), name: form.name, phone: form.phone, email: form.email, page }),
      });
      const data = await res.json();
      if (!data.success) {
        setFormError(data.message || 'Something went wrong — please try again.');
        setFormStatus('error');
        return;
      }
      setFormStatus('done');
      if (data.bookingId) {
        trackBookingConversion({
          bookingId: data.bookingId,
          source: data.source,
          medium: data.medium,
          campaign: data.campaign,
          alreadyProcessed: data.alreadyProcessed,
        });
      }
      // The dedicated BannerPopupEvent row is already written server-side
      // (see the route's own comment) — this is only the dataLayer bonus
      // signal for clinics with GTM active, same as every other popup
      // event's split path, without a second DB write.
      if (!forcePreview) {
        pushDataLayerEvent('flash_offer_lead_submitted', {
          offerId: String(banner._id),
          offerName: banner.headline || '',
          presentationMode: 'flash-popup',
          page,
        });
      }
    } catch {
      setFormError('Network error — please try again.');
      setFormStatus('error');
    }
  }

  if (!banner || !open) return null;

  const backdrop = banner.splashBackdrop || { blur: 0, darkness: 0.6 };
  const showCountdown = banner.splashShowCountdown !== false && !banner.formEnabled;
  // Sound never autoplays — this toggle is the only thing that ever calls
  // playPopupSound() outside a CTA click, and it only renders at all when
  // an admin has actually configured a sound (see popupSound.ts's own
  // comment on why every call site must be a real click handler). Hidden
  // entirely under reduced motion, same as the entrance effect.
  const soundConfigured = !reduced && !!banner.splashSound?.enabled && !!banner.splashSound?.effect;
  const desktopImg = banner.desktopImage?.url ? banner.desktopImage : null;
  const mobileImg = banner.mobileImage?.url ? banner.mobileImage : desktopImg;
  // "Story View" — a real slide list (2+ populated entries) takes over the
  // media area entirely; a single or empty slides array falls through to
  // the existing desktop/mobile image rendering untouched. Filtering out
  // slides with no url guards against an admin adding a slide row and not
  // finishing the upload yet.
  const slides = (banner.storySlides || []).filter((s) => s.url);
  const hasStorySlides = slides.length > 0;
  const safeSlideIndex = hasStorySlides ? Math.min(slideIndex, slides.length - 1) : 0;
  const activeSlide = slides[safeSlideIndex];

  return (
    <div
      className={`${forcePreview ? 'absolute' : 'fixed'} inset-0 z-[200] flex items-center justify-center p-4 ${reduced ? '' : 'animate-[fadeIn_0.25s_ease-out]'}`}
      style={{
        backgroundColor: `rgba(0,0,0,${backdrop.darkness ?? 0.6})`,
        backdropFilter: backdrop.blur ? `blur(${backdrop.blur}px)` : undefined,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-modal="true"
      aria-label={banner.headline || 'Special offer'}
    >
      <div
        ref={cardRef}
        className={`relative w-full max-w-md sm:max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl ${reduced ? '' : 'animate-[scaleIn_0.25s_ease-out]'}`}
      >
        <PopupEntranceEffect
          style={banner.splashAnimationStyle || 'sparkle'}
          lottieUrl={banner.lottieUrl}
          reduced={reduced}
        />

        {soundConfigured && (
          <button
            onClick={handleSoundClick}
            aria-label="Play sound"
            title="Play sound"
            className="absolute top-3 right-14 z-20 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition"
          >
            <Volume2 size={16} />
          </button>
        )}

        <button
          ref={closeBtnRef}
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition"
        >
          <X size={18} />
        </button>

        {/* Auto-close countdown ring — a quiet, non-intrusive affordance
            rather than a bare number, so it reads as "closing soon" at a
            glance without competing with the offer content for attention. */}
        {showCountdown && (
          <svg className="absolute top-3 left-3 z-20 -rotate-90" width="28" height="28" viewBox="0 0 28 28">
            <circle cx="14" cy="14" r="11" fill="rgba(0,0,0,0.3)" />
            <circle
              cx="14" cy="14" r="11" fill="none" stroke="white" strokeWidth="2.5"
              strokeDasharray={2 * Math.PI * 11}
              strokeDashoffset={2 * Math.PI * 11 * (1 - remaining / Math.max(1, banner.splashAutoCloseSeconds || 5))}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
        )}

        <div className="flex flex-col sm:flex-row">
          {hasStorySlides ? (
            <div className="relative h-48 sm:h-auto sm:w-2/5 shrink-0 bg-[#0B2560] overflow-hidden">
              {/* Thin per-slide progress bars along the top — the exact
                  affordance Instagram/WhatsApp Stories use, so the
                  "swipe/tap through multiple shots" gesture needs zero
                  explanation for this audience. */}
              <div className="absolute top-2 inset-x-2 z-10 flex gap-1">
                {slides.map((_, i) => (
                  <span key={i} className={`h-[3px] flex-1 rounded-full ${i === safeSlideIndex ? 'bg-white' : 'bg-white/35'}`} />
                ))}
              </div>
              {activeSlide.type === 'video' ? (
                <video
                  key={activeSlide.publicId || activeSlide.url}
                  src={activeSlide.url}
                  autoPlay muted loop playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <Image
                  key={activeSlide.publicId || activeSlide.url}
                  src={activeSlide.publicId ? cloudImgFocal(activeSlide.publicId, { w: 800, h: 800, focalPoint: activeSlide.focalPoint }) : activeSlide.url}
                  alt={banner.headline || 'Special offer'}
                  fill
                  sizes="40vw"
                  className="object-cover"
                  style={{ objectPosition: focalPointToObjectPosition(activeSlide.focalPoint) }}
                />
              )}
              {slides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setSlideIndex((i) => (i - 1 + slides.length) % slides.length)}
                    aria-label="Previous slide"
                    className="absolute inset-y-0 left-0 w-1/3 flex items-center justify-start pl-1 text-white/0 hover:text-white/70 transition"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlideIndex((i) => (i + 1) % slides.length)}
                    aria-label="Next slide"
                    className="absolute inset-y-0 right-0 w-1/3 flex items-center justify-end pr-1 text-white/0 hover:text-white/70 transition"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>
          ) : (
            (desktopImg || mobileImg) && (
              <div className="relative h-40 sm:h-auto sm:w-2/5 shrink-0 bg-[#0B2560]">
                {desktopImg && (
                  <Image
                    src={desktopImg.publicId ? cloudImgFocal(desktopImg.publicId, { w: 800, h: 800, focalPoint: desktopImg.focalPoint }) : desktopImg.url}
                    alt={banner.headline || 'Special offer'}
                    fill
                    sizes="40vw"
                    className="object-cover hidden sm:block"
                    style={{ objectPosition: focalPointToObjectPosition(desktopImg.focalPoint) }}
                  />
                )}
                {mobileImg && (
                  <Image
                    src={mobileImg.publicId ? cloudImgFocal(mobileImg.publicId, { w: 800, h: 480, focalPoint: mobileImg.focalPoint }) : mobileImg.url}
                    alt={banner.headline || 'Special offer'}
                    fill
                    sizes="100vw"
                    className="object-cover sm:hidden"
                    style={{ objectPosition: focalPointToObjectPosition(mobileImg.focalPoint) }}
                  />
                )}
              </div>
            )
          )}

          <div className="flex-1 p-6 text-center sm:text-left space-y-2">
            {banner.subtitle && (
              <span className="inline-block text-[#A25607] text-[11px] font-bold uppercase tracking-widest">{banner.subtitle}</span>
            )}
            <h2 className="text-xl font-headline font-extrabold text-[#0B2560] leading-snug whitespace-pre-line">{banner.headline}</h2>
            {banner.description && <p className="text-gray-500 text-sm">{banner.description}</p>}

            {banner.formEnabled ? (
              formStatus === 'done' ? (
                <div className="pt-2 flex items-center gap-2 text-emerald-600 text-sm font-semibold justify-center sm:justify-start">
                  <CheckCircle2 size={18} className="shrink-0" />
                  {banner.formSuccessMessage || "Thank you! We'll call you within 2 hours."}
                </div>
              ) : (
                <form onSubmit={submitForm} className="pt-2 space-y-2 text-left">
                  <input
                    type="text"
                    required
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Mobile number"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
                  />
                  {banner.formCollectEmail && (
                    <input
                      type="email"
                      placeholder="Email (optional)"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
                    />
                  )}
                  {formError && <p className="text-xs text-red-500">{formError}</p>}
                  <button
                    type="submit"
                    disabled={formStatus === 'submitting'}
                    className="w-full flex items-center justify-center gap-2 bg-[#0B2560] text-white font-bold text-sm rounded-xl py-2.5 hover:bg-[#0d2d72] disabled:opacity-60 transition"
                  >
                    {formStatus === 'submitting' ? <Loader2 size={15} className="animate-spin" /> : (banner.primaryCTA?.label || 'Claim This Offer')}
                  </button>
                </form>
              )
            ) : (
              banner.primaryCTA?.label && (
                <div className="pt-2" onClick={handleCtaClick}>
                  <CTAButton label={banner.primaryCTA.label} href={banner.primaryCTA.href} variant="primary" />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
