"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Phone } from "lucide-react";

interface Props {
  ctaText: string;
  phone: string;
  /** id of the page's own closing CTA banner — hide while it's in view so we
   *  never show two "book now" prompts on screen at once. */
  hideNearId?: string;
}

// Desktop counterpart to MobileStickyBar. The sidebar booking card is only
// sticky within its own column, so once a reader scrolls past it (this page
// runs long) desktop has no booking action in reach until they scroll back
// up — this fills that gap without adding yet another always-visible CTA.
export default function ServiceStickyDesktopCta({ ctaText, phone, hideNearId = "bottom-cta" }: Props) {
  const [pastHero, setPastHero] = useState(false);
  const [nearClose, setNearClose] = useState(false);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > 640);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const target = hideNearId ? document.getElementById(hideNearId) : null;
    if (!target || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([entry]) => setNearClose(entry.isIntersecting), {
      rootMargin: "0px 0px -10% 0px",
    });
    io.observe(target);
    return () => io.disconnect();
  }, [hideNearId]);

  const visible = pastHero && !nearClose;
  const callHref = phone ? `tel:${phone.replace(/\s/g, "")}` : null;

  return (
    <div
      className={`hidden lg:flex fixed bottom-6 right-6 z-[900] items-center gap-2 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
      }`}
    >
      {callHref && (
        <a
          href={callHref}
          title={phone}
          className="w-12 h-12 rounded-full bg-white text-[#0B2560] shadow-[0_10px_28px_rgba(11,37,96,0.22)] border border-gray-100 flex items-center justify-center hover:-translate-y-0.5 transition-transform"
        >
          <Phone size={17} />
        </a>
      )}
      <Link
        href="/book"
        className="flex items-center gap-2 bg-[#F5A623] text-[#0B2560] font-bold text-sm pl-5 pr-6 py-3.5 rounded-full shadow-[0_10px_28px_rgba(245,166,35,0.35)] hover:-translate-y-0.5 transition-transform"
      >
        <Calendar size={16} /> {ctaText}
      </Link>
    </div>
  );
}
