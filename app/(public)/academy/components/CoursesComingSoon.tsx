'use client';

import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

// Real category names from Course.ts's COURSE_CATEGORIES, no fabricated
// course names/fees/dates — same honest-teaser pattern as
// app/(public)/offers/components/OfferComingSoonSection.tsx.
const TEASERS = [
  { icon: '💉', title: 'Botox & Fillers', copy: 'Hands-on certification in injectable aesthetics — ask us for the syllabus.' },
  { icon: '⚡', title: 'Laser & Energy Devices', copy: 'Device-specific training for practitioners — batches announced soon.' },
  { icon: '🧬', title: 'Hair Restoration', copy: 'Certification in modern hair restoration techniques — coming soon.' },
  { icon: '💆', title: 'PRP & Regenerative Aesthetics', copy: 'Regenerative treatment certification for clinicians — stay tuned.' },
];

export default function CoursesComingSoon({ contactUrl }: { contactUrl: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="text-center mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-2">🚧 Coming Soon</p>
        <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-[#0B2560]">Certification Programs</h2>
        <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">Not live yet — batches and curriculum are on the way. Ask us for the latest.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {TEASERS.map((t) => (
          <div key={t.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <span className="text-2xl block mb-2">{t.icon}</span>
            <p className="font-bold text-[#0B2560] text-xs mb-1">{t.title}</p>
            <p className="text-gray-500 text-[11px] leading-relaxed">{t.copy}</p>
          </div>
        ))}
      </div>

      <div className="text-center">
        <a
          href={contactUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-6 py-3 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition-all duration-200"
        >
          <MessageCircle size={15} /> Ask Us on WhatsApp
        </a>
      </div>
    </motion.div>
  );
}
