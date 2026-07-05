'use client';

import { motion } from 'framer-motion';

interface Milestone {
  period: string;
  title: string;
  desc: string;
}

interface HairTimelineData {
  headline?: string;
  subtitle?: string;
  milestones?: Milestone[];
}

const DEFAULT_MILESTONES: Milestone[] = [
  { period: 'Week 1', title: 'Shedding Slows', desc: 'Hair fall reduces significantly after the first session.' },
  { period: 'Month 1', title: 'New Growth Begins', desc: 'Fine new hair strands start appearing.' },
  { period: 'Month 3', title: 'Visible Improvement', desc: 'Noticeable density and thickness increase.' },
  { period: 'Month 6', title: 'Full Results', desc: 'Complete hair restoration with a natural appearance.' },
];

export default function HairTimelineSection({ data }: { data: HairTimelineData }) {
  const {
    headline = 'What to Expect After PRP Treatment',
    subtitle = 'Your hair growth journey, week by week.',
    milestones = [],
  } = data;
  const items = milestones.length ? milestones : DEFAULT_MILESTONES;

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="max-w-5xl mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">Growth Timeline</p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560]">{headline}</h2>
          <p className="text-gray-500 mt-3 text-sm md:text-base max-w-xl mx-auto">{subtitle}</p>
        </motion.div>

        {/* Desktop: horizontal progress bar */}
        <div className="hidden md:block">
          <div className="relative pt-6">
            <div className="absolute top-8 left-[12.5%] right-[12.5%] h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 1.6, ease: 'easeInOut' }}
                style={{ transformOrigin: 'left' }}
                className="h-full w-full rounded-full bg-gradient-to-r from-gray-300 via-[#3B82C4] to-[#F5A623]"
              />
            </div>

            <div
              className="grid gap-4 relative"
              style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
            >
              {items.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.2, ease: 'easeOut' }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="w-5 h-5 rounded-full bg-[#F5A623] border-4 border-white ring-2 ring-[#F5A623]/40 shadow relative z-10 mb-5" />
                  <span className="inline-block bg-[#0B2560] text-white text-xs font-extrabold px-3 py-1 rounded-full mb-2">
                    {m.period}
                  </span>
                  <h3 className="font-bold text-[#0B2560] text-sm md:text-base mb-1.5">{m.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed px-2">{m.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile: vertical progress */}
        <div className="md:hidden relative">
          <div className="absolute left-[9px] top-2 bottom-2 w-1 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1.6, ease: 'easeInOut' }}
              style={{ transformOrigin: 'top' }}
              className="w-full h-full rounded-full bg-gradient-to-b from-gray-300 via-[#3B82C4] to-[#F5A623]"
            />
          </div>
          <div className="space-y-6">
            {items.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.15, ease: 'easeOut' }}
                className="flex gap-4 items-start pl-0"
              >
                <div className="w-5 h-5 mt-1 shrink-0 rounded-full bg-[#F5A623] border-4 border-white ring-2 ring-[#F5A623]/40 shadow relative z-10" />
                <div>
                  <span className="inline-block bg-[#0B2560] text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full mb-1.5">
                    {m.period}
                  </span>
                  <h3 className="font-bold text-[#0B2560] text-sm mb-1">{m.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{m.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
