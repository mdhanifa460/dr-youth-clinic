'use client';

import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

const TEASERS = [
  { icon: '💳', title: 'Membership', copy: 'Ask about ongoing treatment-plan pricing at your next consultation.' },
  { icon: '🎁', title: 'Combo Packages', copy: 'Bundle multiple treatments together — ask our team what pairs well for your goals.' },
  { icon: '⭐', title: 'Loyalty Rewards', copy: "Coming soon for our returning patients — we'll let you know as soon as it launches." },
  { icon: '🤝', title: 'Refer & Earn', copy: 'A referral programme is on the way. Reach out and we’ll keep you posted.' },
  { icon: '🎉', title: 'Festival Specials', copy: 'Seasonal offers are announced right here and on WhatsApp — stay tuned.' },
];

// Honest "coming soon" teaser — same fade/slide-up entrance values as
// AnimatedBannerWrapper.tsx (that component doesn't accept a className, so
// replicated inline rather than nested). Deliberately no fabricated
// pricing/points/dead CTAs — one real WhatsApp/phone contact channel only.
export default function OfferComingSoonSection({ contactUrl }: { contactUrl: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-[#f6faff] py-14"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-2">🚧 Coming Soon</p>
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-[#0B2560]">More Ways to Save</h2>
          <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">Not live yet — but on the way. Ask us for the latest.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {TEASERS.map((t) => (
            <div key={t.title} className="offer-gradient-border-muted rounded-2xl p-4 text-center">
              <span className="text-2xl block mb-2">{t.icon}</span>
              <p className="font-bold text-[#0B2560] text-xs mb-1">{t.title}</p>
              <p className="text-gray-400 text-[11px] leading-relaxed">{t.copy}</p>
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
      </div>
    </motion.section>
  );
}
