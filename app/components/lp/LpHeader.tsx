'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Phone } from 'lucide-react';

interface LpHeaderProps {
  phone?: string;
  whatsapp?: string;
  ctaText?: string;
  logoUrl?: string;
}

export default function LpHeader({ phone, whatsapp, ctaText = 'Book Free Slot', logoUrl }: LpHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToForm = () => {
    document.getElementById('lp-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const waLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=Hi, I'd like to book a free consultation`
    : null;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-white shadow-sm border-b border-gray-100'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-3 sm:px-5 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">

        {/* Logo — the source image is a wide lockup (logo + "DR Youth
            Clinic" wordmark baked in, ~3.8:1), matching the box size used
            in the main Navbar/Footer. A tight square box here used to
            shrink it to an illegible sliver, which is why a separate
            "DR Youth Clinic" text label existed next to it — redundant
            now that the logo itself renders at a readable size.
            The wordmark is dark navy — same fix as the main Footer
            (brightness-0 invert) to stay legible on the transparent/
            unscrolled state's dark hero, reverting to normal color once
            the header itself goes white on scroll.
            Fluid width (clamp, not a breakpoint jump) — at the ~320-390px
            widths where the logo + WhatsApp icon + CTA button used to not
            all fit (measured: this row needs ~400px, clipping the CTA
            text past the viewport edge below that), the logo now shrinks
            continuously instead of holding a fixed 150px regardless of
            available space. width/height stay at the intrinsic size for
            next/image's aspect-ratio math; the rendered box is capped by
            CSS via style. */}
        <div className="flex items-center shrink-0 min-w-0">
          <Image
            src={logoUrl || "/logo.png"}
            alt="DR Youth Clinic"
            width={150}
            height={48}
            className={`object-contain h-auto transition-all duration-300 ${scrolled ? '' : 'brightness-0 invert'}`}
            style={{ width: 'clamp(84px, 26vw, 150px)' }}
          />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 sm:gap-3 min-w-0">
          {/* Phone — hidden on small mobile */}
          {phone && (
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              className={`hidden sm:flex items-center gap-1.5 text-sm font-semibold transition-colors duration-300 ${
                scrolled ? 'text-[#0B2560]' : 'text-white/90'
              } hover:opacity-80`}
            >
              <Phone size={14} className="shrink-0" />
              <span>{phone}</span>
            </a>
          )}

          {/* WhatsApp — icon only, all screen sizes */}
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-1.5 sm:p-2 rounded-xl transition-colors touch-manipulation shrink-0 ${
                scrolled ? 'text-[#0B2560]' : 'text-white'
              }`}
              aria-label="Chat on WhatsApp"
            >
              {/* WhatsApp SVG icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px] sm:w-5 sm:h-5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
          )}

          {/* Book CTA — fluid padding/font (clamp, not a breakpoint jump)
              so it shrinks continuously as the viewport narrows, rather
              than holding a fixed size regardless of available space.
              min-w-0 lets the button actually shrink instead of forcing
              the row wider than the viewport — flex children default to
              min-width:auto, which is what caused the original overflow;
              that's the real fix, the clamp() is just what keeps it
              legible while shrinking. Measured: with this, the full
              ctaText now fits at every width down to 320px — no
              icon-only/short-label fallback needed. */}
          <button
            onClick={scrollToForm}
            aria-label={ctaText}
            className="flex items-center gap-1 sm:gap-1.5 bg-[#F5A623] hover:bg-[#e09516] text-[#0B2560] font-extrabold rounded-lg sm:rounded-xl shadow-lg hover:-translate-y-0.5 transition-all duration-200 touch-manipulation shrink-0 min-w-0"
            style={{
              paddingInline: 'clamp(0.65rem, 3.2vw, 1.25rem)',
              paddingBlock: 'clamp(0.5rem, 1.6vw, 0.65rem)',
              fontSize: 'clamp(11px, 3vw, 14px)',
            }}
          >
            <span className="whitespace-nowrap">{ctaText}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
