'use client';

import Link from 'next/link';
import { Phone, MessageCircle, CalendarCheck } from 'lucide-react';

interface HeroData {
  headline?: string;
  subheadline?: string;
  badge?: string;
  ctaPrimary?: { text: string; href: string };
  phone?: string;
  whatsapp?: string;
  backgroundImage?: string;
  overlayColor?: string;
}

export default function HeroSection({ data }: { data: HeroData }) {
  const {
    headline = 'Transform Your Skin with Expert Care',
    subheadline = 'Book a free consultation today — limited slots available',
    badge,
    ctaPrimary,
    phone,
    whatsapp,
    backgroundImage,
    overlayColor = '#0B2560',
  } = data;

  const bgStyle = backgroundImage
    ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  const waLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=Hi, I'd like to book a free consultation`
    : null;

  return (
    <section className="relative min-h-[85vh] md:min-h-[80vh] flex items-center overflow-hidden" style={bgStyle}>
      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: backgroundImage
            ? `linear-gradient(135deg, ${overlayColor}ee 0%, ${overlayColor}99 60%, ${overlayColor}55 100%)`
            : `linear-gradient(135deg, #0B2560 0%, #1a3a7a 50%, #3B82C4 100%)`,
        }}
      />

      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-[#F5A623]/10 translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-5 py-16 md:py-24">
        <div className="max-w-2xl">
          {badge && (
            <div className="inline-flex items-center gap-2 bg-[#F5A623]/20 border border-[#F5A623]/40 text-[#F5A623] text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6 backdrop-blur-sm">
              {badge}
            </div>
          )}

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
            {headline}
          </h1>

          <p className="mt-5 text-base md:text-lg text-white/75 leading-relaxed max-w-xl">
            {subheadline}
          </p>

          {/* Trust micro-signals */}
          <div className="flex flex-wrap gap-4 mt-6">
            {['✓ Free Consultation', '✓ Expert Doctors', '✓ Proven Results'].map((t) => (
              <span key={t} className="text-xs font-semibold text-white/80">
                {t}
              </span>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            {ctaPrimary?.href && (
              <Link href={ctaPrimary.href}>
                <button className="flex items-center justify-center gap-2 bg-[#F5A623] hover:bg-[#e09516] text-[#0B2560] font-extrabold px-8 py-4 rounded-2xl text-base shadow-2xl shadow-[#F5A623]/30 hover:-translate-y-0.5 transition-all duration-200 w-full sm:w-auto">
                  <CalendarCheck size={18} />
                  {ctaPrimary.text || 'Book Free Consultation'}
                </button>
              </Link>
            )}

            {phone && (
              <a href={`tel:${phone.replace(/\s/g, '')}`}>
                <button className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold px-7 py-4 rounded-2xl text-base backdrop-blur-sm hover:-translate-y-0.5 transition-all duration-200 w-full sm:w-auto">
                  <Phone size={17} />
                  {phone}
                </button>
              </a>
            )}

            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer">
                <button className="flex items-center justify-center gap-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/50 text-white font-bold px-7 py-4 rounded-2xl text-base hover:-translate-y-0.5 transition-all duration-200 w-full sm:w-auto">
                  <MessageCircle size={17} />
                  WhatsApp
                </button>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
