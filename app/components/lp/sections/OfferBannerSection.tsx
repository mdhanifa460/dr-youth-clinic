'use client';

import { useEffect, useState } from 'react';

interface OfferBannerData {
  badge?: string;
  headline?: string;
  subtext?: string;
  expiry?: string;
  emiAvailable?: boolean;
  ctaText?: string;
}

function Countdown({ expiry }: { expiry: string }) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const target = new Date(expiry).getTime();

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiry]);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-2 justify-center">
      <span className="text-xs text-white/70 font-semibold uppercase tracking-wider">Offer ends in:</span>
      <div className="flex gap-1 font-mono">
        {[{ v: timeLeft.h, l: 'H' }, { v: timeLeft.m, l: 'M' }, { v: timeLeft.s, l: 'S' }].map(({ v, l }) => (
          <span key={l} className="bg-black/20 border border-white/20 text-white font-bold text-sm px-2 py-1 rounded-lg">
            {pad(v)}<span className="text-[9px] text-white/50 ml-0.5">{l}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function OfferBannerSection({ data }: { data: OfferBannerData }) {
  const {
    badge = '🔥 Limited Time',
    headline = 'Book Your Free Consultation Today',
    subtext = 'Only 10 slots remaining this week',
    expiry,
    emiAvailable = true,
    ctaText = 'Claim Your Free Slot',
  } = data;

  const expiryValid = expiry && !isNaN(new Date(expiry).getTime()) && new Date(expiry) > new Date();

  return (
    <section className="bg-gradient-to-r from-[#0B2560] via-[#1a3a7a] to-[#0B2560] py-12 md:py-16 relative overflow-hidden">
      {/* Background shimmer */}
      <div className="absolute inset-0 bg-[#F5A623]/5 [background-image:repeating-linear-gradient(45deg,transparent,transparent_40px,rgba(245,166,35,0.03)_40px,rgba(245,166,35,0.03)_80px)]" />

      <div className="relative max-w-3xl mx-auto px-5 text-center">
        {badge && (
          <div className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] text-xs font-extrabold uppercase tracking-widest px-4 py-2 rounded-full mb-4 shadow-lg">
            {badge}
          </div>
        )}

        <h2 className="text-2xl md:text-4xl font-extrabold text-white leading-tight">{headline}</h2>

        {subtext && (
          <p className="mt-3 text-white/70 font-semibold">{subtext}</p>
        )}

        {expiryValid && (
          <div className="mt-4">
            <Countdown expiry={expiry!} />
          </div>
        )}

        {emiAvailable && (
          <p className="mt-3 text-[#F5A623] text-sm font-semibold">
            ✦ EMI options available · Zero-cost EMI on 3 / 6 months
          </p>
        )}

        <button
          onClick={() => {
            const formEl = document.getElementById('lp-form');
            formEl?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="mt-7 inline-flex items-center gap-2 bg-[#F5A623] hover:bg-[#e09516] text-[#0B2560] font-extrabold px-8 py-4 rounded-2xl text-base shadow-2xl shadow-[#F5A623]/30 hover:-translate-y-0.5 transition-all duration-200"
        >
          {ctaText}
        </button>
      </div>
    </section>
  );
}
