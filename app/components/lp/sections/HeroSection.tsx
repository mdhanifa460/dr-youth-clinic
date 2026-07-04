'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Phone, MessageCircle, CalendarCheck, CheckCircle } from 'lucide-react';

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

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const bgStyle = backgroundImage
    ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  const waLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=Hi, I'd like to book a free consultation`
    : null;

  return (
    <>
      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroFloatIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroPulseGreen {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.82); }
        }
        .hero-h1    { animation: heroFadeUp  0.65s 0s    ease both; }
        .hero-sub   { animation: heroFadeUp  0.65s 0.18s ease both; }
        .hero-trust { animation: heroFadeUp  0.65s 0.32s ease both; }
        .hero-ctas  { animation: heroFadeUp  0.65s 0.46s ease both; }
        .hero-chip  { animation: heroFadeUp  0.65s 0s    ease both; }
        .hero-social { animation: heroFloatIn 0.8s 0.6s  ease both; }
        .green-dot  { animation: heroPulseGreen 1.6s ease-in-out infinite; }
      `}</style>

      <section
        className="relative min-h-[100dvh] flex items-center overflow-hidden"
        style={bgStyle}
      >
        <div
          className="absolute inset-0"
          style={{
            background: backgroundImage
              ? `linear-gradient(100deg, ${overlayColor}d9 0%, ${overlayColor}99 50%, ${overlayColor}55 100%)`
              : `linear-gradient(135deg, #0B2560 0%, #1a3a7a 50%, #3B82C4 100%)`,
          }}
        />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#F5A623]/[0.08] translate-y-1/3 pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-[260px] h-[260px] rounded-full bg-[#3B82C4]/10 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-5 pt-24 pb-16 md:pt-28 md:pb-24">
          <div className="max-w-2xl">
            <div className={`inline-flex items-center gap-2 bg-white/10 border border-white/25 text-white text-xs font-bold px-4 py-2 rounded-full mb-4 ${mounted ? 'hero-chip' : 'opacity-0'}`}>
              <span className="green-dot w-2 h-2 rounded-full bg-green-400 inline-block" />
              Accepting New Patients
            </div>

            {badge && (
              <div className={`inline-flex items-center gap-2 bg-[#F5A623]/20 border border-[#F5A623]/40 text-[#F5A623] text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-4 backdrop-blur-sm ml-2 ${mounted ? 'hero-chip' : 'opacity-0'}`}>
                {badge}
              </div>
            )}

            <h1 className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mt-2 ${mounted ? 'hero-h1' : 'opacity-0'}`}>
              {headline}
            </h1>

            <p className={`mt-5 text-base md:text-lg text-white/80 leading-relaxed max-w-xl ${mounted ? 'hero-sub' : 'opacity-0'}`}>
              {subheadline}
            </p>

            <div className={`flex flex-wrap gap-5 mt-6 ${mounted ? 'hero-trust' : 'opacity-0'}`}>
              {['Free Consultation', 'Expert Doctors', 'Proven Results'].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-sm font-semibold text-white/90">
                  <CheckCircle size={14} className="text-[#F5A623] shrink-0" />
                  {t}
                </span>
              ))}
            </div>

            <div className={`flex flex-col sm:flex-row gap-3 mt-8 ${mounted ? 'hero-ctas' : 'opacity-0'}`}>
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

        <div className={`absolute bottom-8 left-5 md:left-10 ${mounted ? 'hero-social' : 'opacity-0'}`}>
          <div className="bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
            <div className="text-[#F5A623] text-xl leading-none">⭐</div>
            <div>
              <p className="text-white font-bold text-sm leading-none">4.9 Rating</p>
              <p className="text-white/70 text-xs mt-0.5">25,000+ patients</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
