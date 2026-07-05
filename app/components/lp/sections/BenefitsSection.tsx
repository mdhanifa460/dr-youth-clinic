'use client';

import { motion } from 'framer-motion';
import { Stethoscope, Cpu, UserCheck, Leaf, HeartHandshake } from 'lucide-react';

interface BenefitItem {
  icon?: string;
  title?: string;
  desc?: string;
}

interface BenefitsData {
  headline?: string;
  subtitle?: string;
  items?: BenefitItem[];
}

const ICONS = [Stethoscope, Cpu, UserCheck, Leaf, HeartHandshake] as const;

const DEFAULT_ITEMS: BenefitItem[] = [
  { title: 'Experienced Doctors', desc: '20+ years of expertise in hair restoration.' },
  { title: 'Advanced Technology', desc: 'FDA-approved, state-of-the-art equipment.' },
  { title: 'Personalised Treatment', desc: 'Protocols tailored to your unique hair goals.' },
  { title: 'Safe & Natural', desc: 'Non-surgical, drug-free, using your own plasma.' },
  { title: 'Complete Care', desc: 'End-to-end support from consult to results.' },
];

export default function BenefitsSection({ data }: { data: BenefitsData }) {
  const {
    headline = 'Why Choose DR Youth Clinic?',
    subtitle = 'Trusted by thousands for safe, effective and lasting results.',
    items = [],
  } = data;
  const cards = items.length ? items : DEFAULT_ITEMS;

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">Our Advantages</p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560]">{headline}</h2>
          <p className="text-gray-500 mt-3 text-sm md:text-base max-w-xl mx-auto">{subtitle}</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5">
          {cards.map((item, i) => {
            const Icon = ICONS[i % ICONS.length];
            const hasEmoji = item.icon && item.icon !== '✓';
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
                className="group bg-white border border-gray-100 rounded-2xl p-5 md:p-6 text-center shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4 bg-[#3B82C4]/10 group-hover:bg-[#F5A623] transition-colors duration-300">
                  {hasEmoji ? (
                    <span className="text-2xl">{item.icon}</span>
                  ) : (
                    <Icon size={24} className="text-[#3B82C4] group-hover:text-white transition-colors duration-300" />
                  )}
                </div>
                <h3 className="font-bold text-[#0B2560] text-sm md:text-base mb-1.5">{item.title}</h3>
                <p className="text-xs md:text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
