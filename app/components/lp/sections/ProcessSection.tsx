'use client';

import { motion } from 'framer-motion';
import { Droplet, TestTube, Syringe, Sprout } from 'lucide-react';

interface ProcessStep {
  number?: number;
  title?: string;
  description?: string;
}

interface ProcessData {
  headline?: string;
  subtitle?: string;
  steps?: ProcessStep[];
}

const STEP_ICONS = [Droplet, TestTube, Syringe, Sprout] as const;

const DEFAULT_STEPS: ProcessStep[] = [
  { number: 1, title: 'Blood Collection', description: 'A small sample of your blood is drawn, just like a routine test.' },
  { number: 2, title: 'Separation', description: 'The sample is spun to concentrate the platelet-rich plasma.' },
  { number: 3, title: 'PRP Injection', description: 'Growth-factor-rich plasma is injected into thinning areas.' },
  { number: 4, title: 'Hair Regrowth', description: 'Follicles are stimulated for thicker, healthier hair over time.' },
];

export default function ProcessSection({ data }: { data: ProcessData }) {
  const {
    headline = 'How PRP Treatment Works',
    subtitle = 'A simple, safe and effective process — start to finish.',
    steps = [],
  } = data;
  const stepsToShow = steps.length ? steps : DEFAULT_STEPS;

  return (
    <section className="bg-[#f6faff] py-14 md:py-20">
      <div className="max-w-5xl mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">The Process</p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560]">{headline}</h2>
          <p className="text-gray-500 mt-3 text-sm md:text-base max-w-xl mx-auto">{subtitle}</p>
        </motion.div>

        {/* Desktop: horizontal with animated connector line */}
        <div className="hidden md:block">
          <div className="relative">
            {/* base line */}
            <div className="absolute top-9 left-[12.5%] right-[12.5%] h-0.5 bg-gray-200 overflow-hidden rounded-full">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 1.4, ease: 'easeInOut' }}
                style={{ transformOrigin: 'left' }}
                className="h-full w-full bg-gradient-to-r from-[#F5A623] to-[#3B82C4]"
              />
            </div>

            <div
              className="grid gap-4 relative"
              style={{ gridTemplateColumns: `repeat(${stepsToShow.length}, 1fr)` }}
            >
              {stepsToShow.map((step, i) => {
                const Icon = STEP_ICONS[i % STEP_ICONS.length];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.5, delay: i * 0.15, ease: 'easeOut' }}
                    className="flex flex-col items-center text-center"
                  >
                    <div
                      className="w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-lg mb-4 relative z-10"
                      style={{ background: 'linear-gradient(135deg, #F5A623, #3B82C4)' }}
                    >
                      <Icon className="text-white" size={26} />
                    </div>
                    <span className="text-xs font-extrabold text-[#F5A623] uppercase tracking-wider mb-1">
                      Step {step.number ?? i + 1}
                    </span>
                    <h3 className="font-bold text-[#0B2560] text-sm md:text-base mb-1.5">{step.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed px-2">{step.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile: vertical timeline */}
        <div className="md:hidden">
          {stepsToShow.map((step, i) => {
            const Icon = STEP_ICONS[i % STEP_ICONS.length];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
                className="flex gap-4 items-start"
              >
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #F5A623, #3B82C4)' }}
                  >
                    <Icon className="text-white" size={18} />
                  </div>
                  {i < stepsToShow.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gradient-to-b from-[#F5A623] to-[#3B82C4] mt-2 mb-2 min-h-10" />
                  )}
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 shadow-sm flex-1">
                  <span className="text-xs font-extrabold text-[#F5A623] uppercase tracking-wider">
                    Step {step.number ?? i + 1}
                  </span>
                  <h3 className="font-bold text-[#0B2560] text-sm mt-0.5 mb-1">{step.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
