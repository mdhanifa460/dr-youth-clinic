'use client';

import { motion } from 'framer-motion';
import { Phone, CalendarCheck, CheckCircle } from 'lucide-react';

interface CtaData {
  headline?: string;
  subtext?: string;
  ctaPrimary?: string;
  phone?: string;
  whatsapp?: string;
  badges?: string[];
}

const DEFAULT_BADGES = ['Free Consultation', 'No Hidden Charges', 'Expert Guidance', 'Safe & Effective'];

export default function CtaSection({ data }: { data: CtaData }) {
  const {
    headline = 'Ready to Regrow Your Confidence?',
    subtext = 'Book your free consultation today and take the first step toward healthier hair.',
    ctaPrimary = 'Book Free Consultation',
    phone,
    badges = DEFAULT_BADGES,
  } = data;

  return (
    <section className="bg-gradient-to-br from-[#0B2560] to-[#1e407a] py-14 md:py-20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#3B82C4]/10 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-[#F5A623]/10 -translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative max-w-6xl mx-auto px-5"
      >
        <div className="grid md:grid-cols-[3fr_2fr] gap-10 items-center">
          {/* Left */}
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">{headline}</h2>
            <p className="mt-4 text-white/70 text-base md:text-lg">{subtext}</p>

            <div className="flex flex-wrap gap-x-6 gap-y-3 mt-7">
              {badges.map((b) => (
                <span key={b} className="flex items-center gap-2 text-sm font-semibold text-white/90">
                  <CheckCircle size={16} className="text-[#F5A623] shrink-0" />
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Right: stacked CTAs */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => document.getElementById('lp-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center justify-center gap-2 bg-[#F5A623] hover:bg-[#e09516] text-[#0B2560] font-extrabold px-8 py-4 rounded-2xl text-base shadow-2xl shadow-[#F5A623]/30 hover:-translate-y-0.5 transition-all duration-200"
            >
              <CalendarCheck size={18} />
              {ctaPrimary}
            </button>
            {phone && (
              <a href={`tel:${phone.replace(/\s/g, '')}`}>
                <button className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold px-7 py-4 rounded-2xl text-base backdrop-blur-sm hover:-translate-y-0.5 transition-all duration-200">
                  <Phone size={17} />
                  Call Now
                </button>
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
