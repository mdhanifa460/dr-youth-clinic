'use client';

import { motion } from 'framer-motion';
import { TrendingDown, Scissors, Waves, Sprout } from 'lucide-react';

type ProblemInput = string | { icon?: string; title?: string; desc?: string };

interface ProblemData {
  headline?: string;
  subtitle?: string;
  problems?: ProblemInput[];
}

const ICONS = [TrendingDown, Scissors, Waves, Sprout] as const;

const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  'hair fall': 'Excessive daily hair shedding that leaves you worried about thinning.',
  'thinning hair': 'Gradually reducing hair density and visible scalp show-through.',
  'receding hairline': 'A hairline moving backward, reshaping your forehead over time.',
  'post hair transplant': 'Support and strengthen growth after a transplant procedure.',
};

function normalize(p: ProblemInput, i: number): { icon: string | null; title: string; desc: string } {
  if (typeof p === 'string') {
    return { icon: null, title: p, desc: DEFAULT_DESCRIPTIONS[p.toLowerCase()] || 'Our PRP protocol is designed to address this concern effectively.' };
  }
  return {
    icon: p.icon || null,
    title: p.title || '',
    desc: p.desc || DEFAULT_DESCRIPTIONS[(p.title || '').toLowerCase()] || 'Our PRP protocol is designed to address this concern effectively.',
  };
}

const DEFAULT_PROBLEMS: ProblemInput[] = ['Hair Fall', 'Thinning Hair', 'Receding Hairline', 'Post Hair Transplant'];

export default function ProblemSection({ data }: { data: ProblemData }) {
  const {
    headline = 'Who is PRP Treatment for?',
    subtitle = 'PRP therapy is ideal for anyone experiencing early to moderate hair loss.',
    problems = DEFAULT_PROBLEMS,
  } = data;

  const cards = (problems.length ? problems : DEFAULT_PROBLEMS).map(normalize);

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="max-w-5xl mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">Is This You?</p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560]">{headline}</h2>
          <p className="text-gray-500 mt-3 text-sm md:text-base max-w-xl mx-auto">{subtitle}</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {cards.map((card, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
                className="group bg-[#f6faff] border border-gray-100 rounded-2xl p-5 md:p-6 hover:border-[#F5A623] hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 group-hover:bg-[#F5A623] group-hover:border-[#F5A623] flex items-center justify-center mb-4 transition-colors duration-300">
                  {card.icon ? (
                    <span className="text-xl">{card.icon}</span>
                  ) : (
                    <Icon size={22} className="text-[#3B82C4] group-hover:text-white transition-colors duration-300" />
                  )}
                </div>
                <h3 className="font-bold text-[#0B2560] text-sm md:text-base mb-1.5">{card.title}</h3>
                <p className="text-xs md:text-sm text-gray-500 leading-relaxed">{card.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
