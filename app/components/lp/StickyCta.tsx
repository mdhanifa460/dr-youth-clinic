'use client';

import { Phone, MessageCircle, CalendarCheck } from 'lucide-react';

interface StickyCtaProps {
  phone?: string;
  whatsapp?: string;
  ctaText?: string;
}

export default function StickyCta({ phone, whatsapp, ctaText = 'Book Free Consultation' }: StickyCtaProps) {
  const waLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=Hi, I'd like to book a free consultation`
    : null;

  const scrollToForm = () => {
    const formEl = document.getElementById('lp-form');
    formEl?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* Mobile: fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-gray-200 shadow-2xl shadow-black/20">
        <div className="flex">
          <button
            onClick={scrollToForm}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3 bg-[#0B2560] text-white font-bold text-xs"
          >
            <CalendarCheck size={18} />
            <span>{ctaText}</span>
          </button>

          {phone && (
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3 bg-[#3B82C4] text-white font-bold text-xs"
            >
              <Phone size={18} />
              <span>Call Now</span>
            </a>
          )}

          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3 bg-[#25D366] text-white font-bold text-xs"
            >
              <MessageCircle size={18} />
              <span>WhatsApp</span>
            </a>
          )}
        </div>
      </div>

      {/* Desktop: fixed right-side button */}
      <div className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-50 flex-col gap-2 pr-0">
        <button
          onClick={scrollToForm}
          className="flex items-center gap-2 bg-[#0B2560] text-white font-bold text-sm px-4 py-3 rounded-l-2xl shadow-2xl hover:bg-[#1a3a7a] hover:-translate-x-1 transition-all duration-200 group"
        >
          <CalendarCheck size={17} />
          <span className="whitespace-nowrap">{ctaText}</span>
        </button>

        {phone && (
          <a href={`tel:${phone.replace(/\s/g, '')}`}>
            <div className="flex items-center gap-2 bg-[#3B82C4] text-white font-bold text-sm px-4 py-3 rounded-l-2xl shadow-xl hover:bg-[#2a70b0] hover:-translate-x-1 transition-all duration-200">
              <Phone size={17} />
              <span className="whitespace-nowrap">{phone}</span>
            </div>
          </a>
        )}

        {waLink && (
          <a href={waLink} target="_blank" rel="noopener noreferrer">
            <div className="flex items-center gap-2 bg-[#25D366] text-white font-bold text-sm px-4 py-3 rounded-l-2xl shadow-xl hover:bg-[#1db155] hover:-translate-x-1 transition-all duration-200">
              <MessageCircle size={17} />
              <span className="whitespace-nowrap">WhatsApp</span>
            </div>
          </a>
        )}
      </div>
    </>
  );
}
