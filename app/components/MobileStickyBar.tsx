"use client";

import { FaWhatsapp } from "react-icons/fa";
import { MdPhone } from "react-icons/md";
import { CalendarCheck } from "lucide-react";
import Link from "next/link";

interface Props {
  phone?: string;
  whatsappUrl?: string;
}

export default function MobileStickyBar({ phone, whatsappUrl }: Props) {
  const callHref = phone ? `tel:${phone.replace(/\s/g, "")}` : null;
  const waHref   = whatsappUrl || (phone ? `https://wa.me/${phone.replace(/[^0-9]/g, "")}` : null);

  // Nothing to show if no contact info at all
  if (!callHref && !waHref) return null;

  return (
    /*
     * Cross-device sticky bar.
     *
     * Key techniques:
     * - `translate-z-0` (translateZ(0)) forces a GPU compositing layer.
     *   Without this, iOS Safari sometimes paints the bar behind page content
     *   on scroll, or not at all when the page first loads.
     * - `env(safe-area-inset-bottom)` pads the bar below the home indicator
     *   on iPhone X+ and modern Android. Requires viewport-fit=cover in the
     *   <meta viewport> tag (set in app/layout.tsx viewportFit:"cover").
     * - `touch-action: manipulation` removes the 300ms tap delay on Android
     *   Chrome and older Samsung browsers.
     * - `webkit-tap-highlight-color: transparent` removes the grey flash on tap
     *   that Samsung Internet shows by default.
     * - `will-change: transform` keeps the bar on its own compositor layer so
     *   iOS doesn't drop it during momentum scroll.
     */
    <div
      className="lg:hidden fixed bottom-0 inset-x-0 z-[9999] flex"
      style={{
        /* GPU layer — prevents iOS Safari fixed-position disappearing bug */
        transform: "translateZ(0)",
        willChange: "transform",
        WebkitBackfaceVisibility: "hidden",
        /* Extend bar into the home-indicator area on notched devices */
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "transparent",
        /* Samsung Internet: remove default tap blue flash */
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Shadow strip above the bar */}
      <div className="absolute inset-x-0 top-0 -translate-y-full h-6 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.12), transparent)" }} />

      {/* WhatsApp */}
      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{ touchAction: "manipulation" }}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 bg-[#25D366] text-white font-semibold text-xs min-h-[56px] py-3 active:brightness-90 transition-[filter]"
        >
          <FaWhatsapp size={20} />
          <span>WhatsApp</span>
        </a>
      )}

      {/* Divider */}
      {waHref && callHref && <div className="w-px bg-white/30 self-stretch" />}

      {/* Call */}
      {callHref && (
        <a
          href={callHref}
          style={{ touchAction: "manipulation" }}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 bg-[#0B2545] text-white font-semibold text-xs min-h-[56px] py-3 active:brightness-90 transition-[filter]"
        >
          <MdPhone size={20} />
          <span>Call Us</span>
        </a>
      )}

      {/* Divider */}
      {callHref && <div className="w-px bg-white/30 self-stretch" />}

      {/* Book */}
      <Link
        href="/book"
        style={{ touchAction: "manipulation" }}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 bg-[#F5A623] text-white font-bold text-xs min-h-[56px] py-3 active:brightness-90 transition-[filter]"
      >
        <CalendarCheck size={20} />
        <span>Book Now</span>
      </Link>
    </div>
  );
}
