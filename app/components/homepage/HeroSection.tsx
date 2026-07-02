'use client';
import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

const SLIDE_DURATION = 5000;

type Slide = {
  badge: string;
  headline: string;
  highlightText: string;
  description: string;
  ctaPrimary: { text: string; href: string };
  ctaSecondary: { text: string; href: string };
  image: { url: string };
  trustBadges: { icon: string; text: string }[];
  accentBg: string;
};

const EXTRA_SLIDES: Omit<Slide, 'image'>[] = [
  {
    badge: 'EXPERT HAIR RESTORATION',
    headline: 'Restore Your\nHair & Confidence',
    highlightText: 'Naturally',
    description: 'Advanced PRP, GFC & hair transplant procedures for lasting, natural-looking results.',
    ctaPrimary: { text: 'Explore Hair Treatments', href: '/book' },
    ctaSecondary: { text: 'View Results', href: '#results' },
    trustBadges: [
      { icon: '💆', text: 'PRP & GFC Therapy' },
      { icon: '🌿', text: 'Natural Hair Growth' },
      { icon: '✅', text: 'Certified Trichologists' },
    ],
    accentBg: 'from-[#eef6ff] to-[#dcedfb]',
  },
  {
    badge: 'PRECISION LASER CLINIC',
    headline: 'Flawless Skin\nWith Laser',
    highlightText: 'Technology',
    description: 'FDA-approved laser treatments — safe, effective & virtually painless for all skin types.',
    ctaPrimary: { text: 'Book Laser Session', href: '/book' },
    ctaSecondary: { text: 'Our Services', href: '#services' },
    trustBadges: [
      { icon: '⚡', text: 'FDA-Approved Lasers' },
      { icon: '🎯', text: 'Precision Targeting' },
      { icon: '🛡️', text: 'Safe for All Skin Types' },
    ],
    accentBg: 'from-[#f0f4ff] to-[#e2eaf8]',
  },
  {
    badge: 'EXCLUSIVE LIMITED-TIME DEALS',
    headline: 'Premium Treatments\nAt Special',
    highlightText: 'Prices',
    description: 'Save up to 50% on skin, hair & laser packages — handpicked deals for a limited time only.',
    ctaPrimary: { text: 'View All Offers', href: '/offers' },
    ctaSecondary: { text: 'Book Consultation', href: '/book' },
    trustBadges: [
      { icon: '🏷️', text: 'Up to 50% Off' },
      { icon: '🎁', text: 'Exclusive Packages' },
      { icon: '⏰', text: 'Limited Time Only' },
    ],
    accentBg: 'from-[#fffbeb] to-[#fef3c7]',
  },
];

// Listed here so Tailwind includes these gradient classes in the bundle
const ACCENT_OPTIONS = [
  'from-[#f6faff] to-[#e8eff7]',
  'from-[#eef6ff] to-[#dcedfb]',
  'from-[#f0f4ff] to-[#e2eaf8]',
  'from-[#fffbeb] to-[#fef3c7]',
  'from-[#f0fdf4] to-[#dcfce7]',
  'from-[#fff1f2] to-[#ffe4e6]',
];

export default function HeroSection({ data }: { data: any }) {
  const slides: Slide[] = (() => {
    if (data?.slides?.length > 0) {
      return (data.slides as any[]).map((s) => ({
        badge: s.badge || 'ADVANCED AESTHETIC CLINIC',
        headline: s.headline || 'Advanced Skin &\nAesthetic Care',
        highlightText: s.highlightText || 'You Can Trust',
        description: s.description || 'Personalised treatments, advanced technology & real results.',
        ctaPrimary: s.ctaPrimary || { text: 'Book Consultation', href: '/book' },
        ctaSecondary: s.ctaSecondary || { text: 'Our Services', href: '#services' },
        image: s.image?.url ? s.image : { url: '/images/hero-clinical.jpeg' },
        trustBadges: s.trustBadges || [],
        accentBg: s.accentBg || ACCENT_OPTIONS[0],
      }));
    }
    const adminSlide: Slide = {
      badge: data?.badge || 'ADVANCED AESTHETIC CLINIC',
      headline: data?.headline || 'Advanced Skin &\nAesthetic Care',
      highlightText: data?.highlightText || 'You Can Trust',
      description: data?.description || 'Personalised treatments, advanced technology & real results.',
      ctaPrimary: data?.ctaPrimary || { text: 'Book Consultation', href: '/book' },
      ctaSecondary: data?.ctaSecondary || { text: 'Our Services', href: '#services' },
      image: data?.image?.url ? data.image : { url: '/images/hero-clinical.jpeg' },
      trustBadges: data?.trustBadges || [
        { icon: '👨‍⚕️', text: 'Expert Doctors & Surgeons' },
        { icon: '🔬', text: 'Advanced Technology' },
        { icon: '💊', text: 'Personalised Care for Every Patient' },
      ],
      accentBg: 'from-[#f6faff] to-[#e8eff7]',
    };
    return [
      adminSlide,
      { ...EXTRA_SLIDES[0], image: adminSlide.image },
      { ...EXTRA_SLIDES[1], image: adminSlide.image },
    ];
  })();

  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef = useRef<number>(0);

  const goTo = useCallback((index: number) => {
    if (index === pendingRef.current) return;
    pendingRef.current = index;
    setVisible(false);
    setTimeout(() => {
      setCurrent(index);
      setVisible(true);
    }, 380);
  }, []);

  const next = useCallback(() => {
    goTo((pendingRef.current + 1) % slides.length);
  }, [goTo, slides.length]);

  const prev = useCallback(() => {
    goTo((pendingRef.current - 1 + slides.length) % slides.length);
  }, [goTo, slides.length]);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(next, SLIDE_DURATION);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, next]);

  const s = slides[current];

  return (
    <section
      id="home"
      className={`relative flex min-h-[calc(100svh-96px)] md:min-h-[82vh] items-center overflow-hidden bg-gradient-to-br ${s.accentBg} transition-colors duration-700`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Animated content wrapper */}
      <div
        className={`max-w-7xl mx-auto px-4 md:px-6 lg:px-8 w-full grid md:grid-cols-2 gap-7 md:gap-10 lg:gap-12 items-center py-10 sm:py-12 md:py-16 lg:py-20 transition-all duration-500 ease-out ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
      >
        {/* LEFT */}
        <div className="max-w-xl space-y-4 sm:space-y-5 md:space-y-7">
          <span className="inline-flex min-h-9 items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#60A5D8]/20 text-[#0B2560] text-xs sm:text-sm font-semibold tracking-wide">
            <BadgeCheck size={15} className="text-[#0B2560] shrink-0" />
            {s.badge}
          </span>

          <h1 className="text-[2.15rem] sm:text-[2.75rem] md:text-6xl font-headline font-extrabold text-[#0B2560] leading-[1.08] md:leading-tight whitespace-pre-line">
            {s.headline}
            {'\n'}
            <span className="text-[#F5A623]">{s.highlightText}</span>
          </h1>

          <p className="text-gray-700 text-base md:text-lg leading-relaxed font-semibold max-w-lg">{s.description}</p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-1">
            <Link
              href={s.ctaPrimary.href}
              className="min-h-12 w-full sm:w-auto bg-[#0B2560] text-white px-6 sm:px-8 py-3 rounded-xl font-semibold shadow-[0_10px_25px_rgba(11,37,96,0.25)] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(11,37,96,0.28)] transition-all duration-300 flex items-center justify-center gap-2"
            >
              {s.ctaPrimary.text}
              <span>→</span>
            </Link>
            <Link
              href={s.ctaSecondary.href}
              className="min-h-12 w-full sm:w-auto bg-white border border-gray-300 text-[#0B2560] px-6 sm:px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300 flex items-center justify-center"
            >
              {s.ctaSecondary.text}
            </Link>
          </div>

          {s.trustBadges.length > 0 && (
            <div className="flex flex-wrap gap-3 sm:gap-4 md:gap-6 pt-1">
              {s.trustBadges.map((b, i) => (
                <div key={i} className="flex min-h-9 items-center gap-2 rounded-full bg-white/60 px-3 py-1.5 text-xs sm:text-sm text-gray-600 shadow-sm ring-1 ring-white/70 md:bg-transparent md:px-0 md:shadow-none md:ring-0">
                  <span className="text-lg sm:text-xl">{b.icon}</span>
                  <span className="font-medium leading-snug">{b.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="relative mt-2 md:mt-0">
          <div className="absolute -inset-4 bg-[#0B2560]/10 blur-3xl rounded-full" />
          <div className="relative bg-white p-3 sm:p-4 rounded-3xl shadow-[0_18px_50px_rgba(11,37,96,0.12)] ring-1 ring-white/80 overflow-hidden">
            {s.image?.url ? (
              <Image
                src={s.image.url}
                alt="DR Youth Clinic"
                width={500}
                height={500}
                className={`rounded-2xl w-full h-[260px] sm:h-[320px] md:h-[420px] object-cover transition-transform duration-[8000ms] ease-linear ${visible ? 'scale-110' : 'scale-100'}`}
                priority
              />
            ) : (
              <div className="rounded-2xl w-full h-[260px] sm:h-[320px] md:h-[420px] bg-gradient-to-br from-[#0B2560]/20 to-[#60A5D8]/20 flex items-center justify-center">
                <span className="text-5xl">🏥</span>
              </div>
            )}
            <div className="absolute bottom-3 left-3 sm:-bottom-4 sm:-left-4 bg-[#3B82C4] p-4 sm:p-5 md:p-6 rounded-2xl shadow-xl max-w-[180px] sm:max-w-[200px]">
              <p className="text-2xl sm:text-3xl md:text-4xl text-white font-extrabold block mb-0.5 sm:mb-1">10k+</p>
              <p className="text-white/90 font-semibold text-xs sm:text-sm leading-snug">Successful Procedures Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Prev arrow — hidden on mobile to avoid overlap with content */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        className="hidden sm:flex absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-md items-center justify-center text-[#0B2560] hover:bg-white hover:scale-105 transition-all duration-200 z-10"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Next arrow — hidden on mobile */}
      <button
        onClick={next}
        aria-label="Next slide"
        className="hidden sm:flex absolute right-4 md:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-md items-center justify-center text-[#0B2560] hover:bg-white hover:scale-105 transition-all duration-200 z-10"
      >
        <ChevronRight size={20} />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`rounded-full transition-all duration-300 touch-manipulation ${
              i === current
                ? 'w-8 h-3 bg-[#0B2560]'
                : 'w-3 h-3 bg-[#0B2560]/30 hover:bg-[#0B2560]/60'
            }`}
          />
        ))}
      </div>

      {/* Progress bar */}
      {!paused && (
        <div className="absolute bottom-0 left-0 h-[3px] bg-[#0B2560]/10 w-full">
          <div
            key={`${current}-progress`}
            className="h-full bg-[#0B2560]/40 rounded-full"
            style={{
              animation: `slideProgress ${SLIDE_DURATION}ms linear forwards`,
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes slideProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </section>
  );
}
