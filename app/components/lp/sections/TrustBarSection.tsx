'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, animate } from 'framer-motion';
import { Users, Clock, Activity, Star, Stethoscope } from 'lucide-react';
import { withClinicYears, withoutPatientClaims } from '@/app/lib/patientClaims';

const MD_COLS: Record<number, string> = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' };

interface StatItem {
  icon?: string;
  value: string;
  label: string;
}

interface TrustBarData {
  stats?: StatItem[];
  // backwards-compat individual fields
  rating?: number | string;
  patients?: string;
  years?: string;
  googleRating?: string;
}

const ICON_MAP: Record<string, typeof Users> = {
  users: Users,
  clock: Clock,
  activity: Activity,
  star: Star,
  stethoscope: Stethoscope,
};

const DEFAULT_STATS: StatItem[] = [
  { icon: 'clock', value: '9+', label: 'Years Experience' },
  { icon: 'stethoscope', value: '10+', label: 'Expert Doctors' },
];

function AnimatedNumber({ raw, start }: { raw: string; start: boolean }) {
  // Split the string into leading number and suffix (e.g. "25,000+" -> 25000 + "+")
  const cleaned = raw.replace(/,/g, '');
  const match = cleaned.match(/^[\d.]+/);
  const target = match ? parseFloat(match[0]) : 0;
  const suffix = cleaned.replace(/^[\d.]+/, '');
  const isDecimal = String(target).includes('.');

  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!start || target === 0) return;
    const controls = animate(0, target, {
      duration: 2,
      ease: 'easeOut',
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [start, target]);

  const display =
    target === 0
      ? raw
      : isDecimal
        ? `${val.toFixed(1)}${suffix}`
        : `${Math.round(val).toLocaleString()}${suffix}`;

  return <span className="tabular-nums">{display}</span>;
}

export default function TrustBarSection({ data }: { data: TrustBarData }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  // Build stats: prefer explicit stats array, else fall back to legacy fields, else defaults
  let stats: StatItem[] = data.stats && data.stats.length ? data.stats : [];
  if (!stats.length && (data.patients || data.years || data.rating || data.googleRating)) {
    stats = [
      { icon: 'users', value: data.patients || '25,000+', label: 'Happy Patients' },
      { icon: 'clock', value: data.years || '9+', label: 'Years Experience' },
      { icon: 'activity', value: '50,000+', label: 'Treatments Done' },
      { icon: 'star', value: `${data.googleRating || data.rating || '4.9'}/5`, label: 'Google Rating' },
      { icon: 'stethoscope', value: '10+', label: 'Expert Doctors' },
    ];
  }
  if (!stats.length) stats = DEFAULT_STATS;
  stats = withClinicYears(withoutPatientClaims(stats));
  if (stats.length === 0) return null;

  return (
    <section className="bg-primary border-y border-champagne/15">
      <div ref={ref} className="max-w-6xl mx-auto px-5">
        <div className={`flex overflow-x-auto md:overflow-visible md:grid ${MD_COLS[stats.length] ?? 'md:grid-cols-4'} divide-x divide-champagne/20`}>
          {stats.map((stat, i) => {
            const Icon = ICON_MAP[(stat.icon || '').toLowerCase()] || Users;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
                className="flex flex-col items-center text-center py-7 px-6 md:px-4 shrink-0 min-w-[40vw] md:min-w-0"
              >
                <Icon size={22} className="text-champagne mb-2.5" />
                <div className="text-2xl md:text-3xl font-extrabold text-white">
                  <AnimatedNumber raw={stat.value} start={inView} />
                </div>
                <div className="text-xs md:text-xs text-white/60 font-semibold uppercase tracking-widest mt-1.5">
                  {stat.label}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
