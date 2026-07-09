'use client';

import { useEffect, useState } from 'react';

interface OfferBannerData {
  badge?: string;
  headline?: string;
  subtext?: string;
  expiry?: string;
  emiAvailable?: boolean;
  ctaText?: string;
  animationStyle?: 'urgent' | 'festive' | 'glow' | 'minimal';
  slotsLeft?: number;
  totalSlots?: number;
  emiText?: string;
}

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

type AnimStyle = 'urgent' | 'festive' | 'glow' | 'minimal';

const STYLE_CONFIG: Record<AnimStyle, {
  bg: string;
  badgeCls: string;
  ctaCls: string;
}> = {
  urgent: {
    bg: 'bg-gradient-to-r from-red-950 via-[#0B2560] to-red-950',
    badgeCls: 'bg-red-500 text-white',
    ctaCls:   'bg-red-500 hover:bg-red-600 text-white',
  },
  festive: {
    bg: 'bg-gradient-to-r from-purple-900 via-[#0B2560] to-[#1a3a7a]',
    badgeCls: 'bg-gradient-to-r from-yellow-400 to-pink-500 text-white',
    ctaCls:   'bg-gradient-to-r from-yellow-400 to-pink-500 hover:from-yellow-500 hover:to-pink-600 text-white',
  },
  glow: {
    bg: 'bg-[#0B2560]',
    badgeCls: 'bg-[#F5A623] text-[#0B2560]',
    ctaCls:   'bg-[#F5A623] hover:bg-[#e09516] text-[#0B2560]',
  },
  minimal: {
    bg: 'bg-gradient-to-r from-[#0B2560] via-[#1a3a7a] to-[#0B2560]',
    badgeCls: 'bg-[#F5A623] text-[#0B2560]',
    ctaCls:   'bg-[#F5A623] hover:bg-[#e09516] text-[#0B2560]',
  },
};

export default function OfferBannerSection({ data }: { data: OfferBannerData }) {
  const {
    badge    = '🔥 Limited Time',
    headline = 'Book Your Free Consultation Today',
    subtext  = 'Only 10 slots remaining this week',
    expiry,
    emiAvailable = true,
    ctaText  = 'Claim Your Free Slot',
    animationStyle = 'minimal',
    slotsLeft,
    totalSlots = 20,
    emiText = 'EMI options available · Zero-cost EMI on 3 / 6 months',
  } = data;

  const countdown = useCountdown(expiry);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const expiryValid = expiry && !isNaN(new Date(expiry).getTime()) && new Date(expiry) > new Date();
  const style = animationStyle as AnimStyle;
  const cfg = STYLE_CONFIG[style] ?? STYLE_CONFIG.minimal;

  const maxSlots = totalSlots || 20;
  const slotsPct = slotsLeft ? Math.max(5, Math.min(100, (slotsLeft / maxSlots) * 100)) : 0;

  return (
    <>
      <style>{`
        @keyframes offerBadgeBounce {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-7px); }
        }
        @keyframes offerShimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes offerGlowPulse {
          0%,100% { box-shadow: 0 0 18px 4px rgba(245,166,35,0.45); }
          50%      { box-shadow: 0 0 42px 14px rgba(245,166,35,0.85); }
        }
        @keyframes offerUrgentShake {
          0%,100% { transform: translateX(0); }
          25%      { transform: translateX(-4px); }
          75%      { transform: translateX( 4px); }
        }
        @keyframes offerUrgentFlash {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.6; }
        }
        @keyframes offerRainbow {
          0%   { border-color: #f59e0b; }
          25%  { border-color: #ec4899; }
          50%  { border-color: #8b5cf6; }
          75%  { border-color: #3b82f6; }
          100% { border-color: #f59e0b; }
        }
        @keyframes offerSlotsBar {
          from { width: 0; }
          to   { width: var(--bar-target); }
        }
        @keyframes offerDotPulse {
          0%,100% { transform: scale(1); opacity:1; }
          50%      { transform: scale(0.7); opacity:0.4; }
        }
        .badge-bounce { animation: offerBadgeBounce 1.5s ease-in-out infinite; }
        .shimmer-headline {
          background: linear-gradient(90deg, #fff 0%, #F5A623 50%, #fff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: offerShimmer 3s linear infinite;
        }
        .glow-cta    { animation: offerGlowPulse 2s ease-in-out infinite; }
        .urgent-shake { animation: offerUrgentShake 0.5s ease-in-out infinite; }
        .urgent-flash { animation: offerUrgentFlash 0.8s ease-in-out infinite; }
        .festive-rainbow { animation: offerRainbow 2s linear infinite; border-width: 3px; border-style: solid; }
        .slots-bar { animation: offerSlotsBar 1.4s ease forwards; }
        .dot-pulse  { animation: offerDotPulse 0.9s ease-in-out infinite; }
      `}</style>

      <section
        className={`${cfg.bg} py-12 md:py-16 relative overflow-hidden ${style === 'festive' ? 'festive-rainbow' : ''}`}
      >
        {/* Background texture */}
        <div className="absolute inset-0 [background-image:repeating-linear-gradient(45deg,transparent,transparent_40px,rgba(245,166,35,0.03)_40px,rgba(245,166,35,0.03)_80px)] pointer-events-none" />

        {/* Festive sparkles */}
        {style === 'festive' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {['8%','28%','55%','78%'].map((left, i) => (
              <span
                key={i}
                className="absolute text-yellow-300 text-2xl select-none"
                style={{
                  left,
                  top: `${18 + i * 16}%`,
                  animation: `offerBadgeBounce ${1 + i * 0.25}s ${i * 0.2}s ease-in-out infinite`,
                }}
              >
                ✦
              </span>
            ))}
          </div>
        )}

        <div className="relative max-w-3xl mx-auto px-5 text-center">
          {/* Badge */}
          {badge && (
            <div className={`inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest px-5 py-2.5 rounded-full mb-5 shadow-lg ${cfg.badgeCls} badge-bounce ${style === 'urgent' ? 'urgent-flash' : ''}`}>
              {badge}
            </div>
          )}

          {/* Headline */}
          <h2 className={`text-2xl md:text-4xl font-extrabold leading-tight ${style === 'glow' ? 'shimmer-headline' : 'text-white'}`}>
            {headline}
          </h2>

          {/* Subtext */}
          {subtext && (
            <p className="mt-3 text-white/70 font-semibold">{subtext}</p>
          )}

          {/* Countdown */}
          {expiryValid && mounted && (
            <div className="mt-5">
              <span className="text-xs text-white/55 font-semibold uppercase tracking-wider block mb-2">
                Offer ends in:
              </span>
              <div className={`flex items-center gap-2 justify-center ${style === 'urgent' ? 'urgent-shake' : ''}`}>
                {[
                  { v: countdown.d, l: 'Days' },
                  { v: countdown.h, l: 'Hrs'  },
                  { v: countdown.m, l: 'Min'  },
                  { v: countdown.s, l: 'Sec'  },
                ].map(({ v, l }) => (
                  <div
                    key={l}
                    className="bg-black/25 border border-white/20 text-white font-extrabold text-xl md:text-3xl px-3 py-2 md:px-5 md:py-3 rounded-xl text-center min-w-[54px] md:min-w-[72px] font-mono"
                  >
                    {pad(v)}
                    <div className="text-[9px] text-white/50 font-normal uppercase tracking-widest">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pulsing dots when no expiry */}
          {!expiryValid && (
            <div className="flex justify-center gap-2 mt-5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-[#F5A623] dot-pulse"
                  style={{ animationDelay: `${i * 0.22}s` }}
                />
              ))}
            </div>
          )}

          {/* Slots remaining */}
          {mounted && slotsLeft !== undefined && slotsLeft > 0 && (
            <div className="mt-5 max-w-xs mx-auto">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white/80">Slots Remaining</span>
                <span className="text-xs font-extrabold text-[#F5A623]">{slotsLeft} left</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#F5A623] to-red-400 rounded-full slots-bar"
                  style={{ '--bar-target': `${slotsPct}%` } as React.CSSProperties}
                />
              </div>
              <p className="text-[10px] text-white/45 mt-1">
                Only {slotsLeft} of {maxSlots} slots remaining this week
              </p>
            </div>
          )}

          {/* EMI badge */}
          {emiAvailable && emiText && (
            <p className="mt-4 text-[#F5A623] text-sm font-semibold">
              ✦ {emiText}
            </p>
          )}

          {/* CTA button */}
          <button
            onClick={() => document.getElementById('lp-form')?.scrollIntoView({ behavior: 'smooth' })}
            className={`mt-7 inline-flex items-center gap-2 font-extrabold px-10 py-4 rounded-2xl text-base shadow-2xl hover:-translate-y-0.5 transition-all duration-200 ${cfg.ctaCls} ${style === 'glow' ? 'glow-cta' : ''} ${style === 'urgent' ? 'animate-pulse' : ''}`}
          >
            {ctaText}
            <span className="text-lg">→</span>
          </button>
        </div>
      </section>
    </>
  );
}
