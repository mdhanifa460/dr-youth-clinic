'use client';

import { useEffect, useRef, useState } from 'react';
import { Stethoscope, ClipboardList, Zap, Star } from 'lucide-react';

interface ProcessStep {
  number?: number;
  title?: string;
  description?: string;
}

interface ProcessData {
  headline?: string;
  steps?: ProcessStep[];
}

const STEP_ICONS = [Stethoscope, ClipboardList, Zap, Star] as const;

export default function ProcessSection({ data }: { data: ProcessData }) {
  const { headline = 'Your Treatment Journey', steps = [] } = data;
  const sectionRef = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!steps.length) return null;

  return (
    <>
      <style>{`
        @keyframes stepFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <section ref={sectionRef} className="bg-white py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">How It Works</p>
            <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560]">{headline}</h2>
          </div>

          {/* Desktop: horizontal steps with animated line */}
          <div className="hidden md:block">
            <div className="relative">
              {/* Animated connector line */}
              <div className="absolute top-10 left-16 right-16 h-0.5 bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#F5A623] to-[#3B82C4] transition-all duration-[1500ms] ease-out"
                  style={{ width: started ? '100%' : '0%' }}
                />
              </div>

              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${Math.min(steps.length, 4)}, 1fr)` }}
              >
                {steps.map((step, i) => {
                  const Icon = STEP_ICONS[i % STEP_ICONS.length];
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center text-center"
                      style={started ? { animation: `stepFadeUp 0.5s ${i * 0.15}s ease both` } : { opacity: 0 }}
                    >
                      <div
                        className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg mb-4 z-10 relative shrink-0"
                        style={{ background: 'linear-gradient(135deg, #F5A623, #3B82C4)' }}
                      >
                        <Icon className="text-white" size={28} />
                      </div>
                      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 w-full">
                        <div className="text-xs font-extrabold text-[#F5A623] mb-1">
                          Step {step.number ?? i + 1}
                        </div>
                        <h3 className="font-bold text-[#0B2560] text-sm mb-1">{step.title}</h3>
                        <p className="text-xs text-gray-500 leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile: vertical timeline */}
          <div className="md:hidden space-y-0">
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[i % STEP_ICONS.length];
              return (
                <div key={i} className="flex gap-4 items-start">
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #F5A623, #3B82C4)' }}
                    >
                      <Icon className="text-white" size={18} />
                    </div>
                    {i < steps.length - 1 && (
                      <div className="w-0.5 flex-1 bg-gradient-to-b from-[#F5A623] to-[#3B82C4] mt-2 mb-2 min-h-8" />
                    )}
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 shadow-sm flex-1">
                    <div className="text-xs font-extrabold text-[#F5A623] mb-0.5">
                      Step {step.number ?? i + 1}
                    </div>
                    <h3 className="font-bold text-[#0B2560] text-sm mb-1">{step.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
