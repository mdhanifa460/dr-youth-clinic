"use client";

import { FaWhatsapp } from "react-icons/fa";
import { MdPhone } from "react-icons/md";
import Link from "next/link";

interface Props {
  phone?: string;
  whatsappUrl?: string;
}

export default function MobileStickyBar({ phone, whatsappUrl }: Props) {
  const callHref = phone ? `tel:${phone.replace(/\s/g, "")}` : "tel:";
  const waHref = whatsappUrl || (phone ? `https://wa.me/${phone.replace(/[^0-9]/g, "")}` : "#");

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-50 flex items-stretch border-t border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.18)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* WhatsApp */}
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold text-sm py-4 active:brightness-90 transition"
      >
        <FaWhatsapp size={18} />
        WhatsApp
      </a>

      {/* Divider */}
      <div className="w-px bg-white/20" />

      {/* Call */}
      <a
        href={callHref}
        className="flex-1 flex items-center justify-center gap-2 bg-[#0B2545] text-white font-semibold text-sm py-4 active:brightness-90 transition"
      >
        <MdPhone size={18} />
        Call Us
      </a>

      {/* Divider */}
      <div className="w-px bg-white/20" />

      {/* Book */}
      <Link
        href="/book"
        className="flex-1 flex items-center justify-center gap-2 bg-[#F5A623] text-white font-semibold text-sm py-4 active:brightness-90 transition"
      >
        Book Now
      </Link>
    </div>
  );
}
