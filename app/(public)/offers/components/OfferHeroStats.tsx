'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, animate } from 'framer-motion';

interface StatItem {
  icon: string;
  label: string;
  value: string;
}

// Extracted from app/components/lp/sections/TrustBarSection.tsx's
// AnimatedNumber — same suffix-parsing + tween logic, reused verbatim.
function AnimatedNumber({ raw, start }: { raw: string; start: boolean }) {
  const cleaned = raw.replace(/,/g, '');
  const match = cleaned.match(/^[\d.]+/);
  const target = match ? parseFloat(match[0]) : 0;
  const suffix = cleaned.replace(/^[\d.]+/, '');
  const isDecimal = String(target).includes('.');

  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!start || target === 0) return;
    const controls = animate(0, target, { duration: 2, ease: 'easeOut', onUpdate: (v) => setVal(v) });
    return () => controls.stop();
  }, [start, target]);

  const display = target === 0 ? raw : isDecimal ? `${val.toFixed(1)}${suffix}` : `${Math.round(val).toLocaleString()}${suffix}`;
  return <span className="tabular-nums">{display}</span>;
}

export default function OfferHeroStats({ stats }: { stats: StatItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <div ref={ref} className="flex flex-wrap gap-8">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
          className="flex items-center gap-3"
        >
          <span className="text-2xl">{s.icon}</span>
          <div>
            <p className="text-xl font-extrabold text-white leading-none">
              <AnimatedNumber raw={s.value} start={inView} />
            </p>
            <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
