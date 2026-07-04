'use client';

import { useEffect, useRef, useState } from 'react';

interface TrustBarData {
  rating?: number;
  patients?: string;
  years?: string;
  googleRating?: string;
}

function useCountAnimation(targetNum: number, isDecimal: boolean, started: boolean): number {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!started || targetNum === 0) return;
    const end = isDecimal ? Math.round(targetNum * 10) : targetNum;
    let startTs: number | null = null;
    const duration = 2000;

    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const progress = Math.min((ts - startTs) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(step);
      else setVal(end);
    };

    requestAnimationFrame(step);
  }, [started, targetNum, isDecimal]);

  return val;
}

interface StatItemProps {
  rawValue: string;
  label: string;
  showStars?: boolean;
  started: boolean;
}

function StatItem({ rawValue, label, showStars, started }: StatItemProps) {
  const cleaned = rawValue.replace(/,/g, '');
  const numMatch = cleaned.match(/^[\d.]+/);
  const targetNum = numMatch ? parseFloat(numMatch[0]) : 0;
  const suffix = cleaned.replace(/^[\d.]+/, '');
  const isDecimal = String(targetNum).includes('.');

  const animated = useCountAnimation(targetNum, isDecimal, started);
  const displayNum = isDecimal
    ? (animated / 10).toFixed(1)
    : animated.toLocaleString();

  return (
    <div className="text-center py-7 px-4">
      {showStars && (
        <div className="text-[#F5A623] text-base tracking-tight mb-1.5">★★★★★</div>
      )}
      <div className="text-2xl md:text-4xl font-extrabold text-white tabular-nums">
        {started ? `${displayNum}${suffix}` : `0${suffix}`}
      </div>
      <div className="text-[10px] md:text-xs text-white/55 font-semibold uppercase tracking-widest mt-1.5">
        {label}
      </div>
    </div>
  );
}

export default function TrustBarSection({ data }: { data: TrustBarData }) {
  const {
    rating = 4.9,
    patients = '25,000+',
    years = '20+',
    googleRating = '4.9',
  } = data;

  const ref = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setStarted(true); observer.disconnect(); }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stats: StatItemProps[] = [
    { rawValue: String(rating), label: 'Patient Rating', showStars: true, started },
    { rawValue: patients, label: 'Happy Patients', started },
    { rawValue: years, label: 'Years Experience', started },
    { rawValue: googleRating, label: 'Google Rating', showStars: true, started },
  ];

  return (
    <section ref={ref} className="bg-[#0B2560] border-b border-[#F5A623]/10">
      <div className="max-w-5xl mx-auto px-5">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#F5A623]/15">
          {stats.map((stat, i) => (
            <StatItem key={i} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
