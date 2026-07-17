"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import type { BannerDoc } from "@/app/lib/banners/types";
import CTAButton from "@/app/components/banners/shared/CTAButton";
import ImageOverlay from "@/app/components/banners/shared/ImageOverlay";

// No lightbox/video-modal component exists elsewhere in the codebase to
// reuse — an inline toggle (poster image → playing <video>) is sufficient
// for v1 rather than building a new modal primitive for this one use case.
export default function ClinicExperienceBanner({ banner }: { banner: BannerDoc }) {
  const [playing, setPlaying] = useState(false);
  const hasVideo = !!banner.video?.url;

  return (
    <div className="relative bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 grid md:grid-cols-2 gap-8 md:gap-12 items-center py-12 sm:py-16 md:py-20">
        <div className="max-w-xl space-y-4">
          {banner.subtitle && (
            <span className="inline-flex items-center gap-1.5 text-[#F5A623] text-xs sm:text-sm font-bold uppercase tracking-widest">
              {banner.subtitle}
            </span>
          )}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-extrabold text-[#0B2560] leading-tight whitespace-pre-line">
            {banner.headline}
          </h1>
          {banner.description && <p className="text-gray-600 text-base md:text-lg leading-relaxed">{banner.description}</p>}
          <div className="pt-2">
            <CTAButton label={banner.primaryCTA?.label} href={banner.primaryCTA?.href} variant="primary" />
          </div>
        </div>

        <div className="relative rounded-3xl overflow-hidden shadow-[0_18px_50px_rgba(11,37,96,0.12)] h-[260px] sm:h-[380px] bg-gray-100">
          {playing && hasVideo ? (
            <video src={banner.video.url} controls autoPlay className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <>
              {banner.desktopImage?.url ? (
                <Image
                  src={banner.desktopImage.url}
                  alt={banner.headline || "Clinic"}
                  fill
                  sizes="(max-width: 768px) 100vw, 560px"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#0B2560]/10 to-[#60A5D8]/10 flex items-center justify-center">
                  <span className="text-5xl">🏥</span>
                </div>
              )}
              {/* Rendered before the play button so it never visually
                  sits on top of it (later DOM order wins in the shared
                  absolute-positioning stacking context) — only applies to
                  the poster image, not while the video is actually
                  playing (would just get in the way of the controls). */}
              <ImageOverlay overlay={banner.overlay} />
              {hasVideo && (
                <button
                  onClick={() => setPlaying(true)}
                  aria-label="Play clinic tour video"
                  className="absolute inset-0 flex items-center justify-center group"
                >
                  <span className="w-16 h-16 rounded-full bg-white/90 group-hover:bg-white shadow-xl flex items-center justify-center transition-transform group-hover:scale-105">
                    <Play size={26} className="text-[#0B2560] ml-1" fill="currentColor" />
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
