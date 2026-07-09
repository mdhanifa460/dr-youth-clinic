'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X } from 'lucide-react';

interface VideoData {
  headline?: string;
  subtitle?: string;
  badge?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  autoplayMuted?: boolean;
  caption?: string;
}

export default function VideoSection({ data }: { data: VideoData }) {
  const {
    headline = 'See How GFC PRP Works',
    subtitle = 'Watch our 10-second treatment overview — the process is simpler than you think.',
    badge = 'Treatment Overview',
    videoUrl,
    thumbnailUrl,
    autoplayMuted = false,
    caption,
  } = data;

  const [open, setOpen] = useState(false);
  const [durationLabel, setDurationLabel] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Read the real video duration from its metadata instead of a hardcoded badge
  useEffect(() => {
    if (!videoUrl) { setDurationLabel(null); return; }
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.src = videoUrl;
    probe.onloadedmetadata = () => {
      const total = Math.round(probe.duration);
      if (isFinite(total) && total > 0) {
        setDurationLabel(`${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`);
      }
    };
    return () => { probe.onloadedmetadata = null; probe.src = ''; };
  }, [videoUrl]);

  // Scroll lock + Escape key close
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Imperative play — keeps audio unmuted (autoPlay attr loses gesture context after React re-render)
  useEffect(() => {
    if (open && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [open]);

  if (!videoUrl) return null;

  const closeModal = () => {
    videoRef.current?.pause();
    setOpen(false);
  };

  // ── Ambient autoplay loop mode ────────────────────────────────────────────
  if (autoplayMuted) {
    return (
      <section className="bg-[#0B2560] py-12 md:py-20">
        <div className="max-w-5xl mx-auto px-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8 md:mb-10"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-3">{badge}</p>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white">{headline}</h2>
            {subtitle && (
              <p className="text-white/60 mt-3 text-sm md:text-base max-w-xl mx-auto">{subtitle}</p>
            )}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl ring-1 ring-[#F5A623]/20"
          >
            <video
              src={videoUrl}
              autoPlay
              muted
              loop
              playsInline
              className="w-full"
            />
          </motion.div>
          {caption && (
            <p className="text-center text-xs text-white/40 mt-4">{caption}</p>
          )}
        </div>
      </section>
    );
  }

  // ── Click-to-play mode ────────────────────────────────────────────────────
  return (
    <section className="bg-white py-12 md:py-20">
      <div className="max-w-5xl mx-auto px-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 md:mb-10"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">{badge}</p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560]">{headline}</h2>
          {subtitle && (
            <p className="text-gray-500 mt-3 text-sm md:text-base max-w-xl mx-auto">{subtitle}</p>
          )}
        </motion.div>

        {/* Thumbnail */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.15 }}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen(true)}
          role="button"
          tabIndex={0}
          aria-label={`Play video: ${headline}`}
          className="relative cursor-pointer rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl active:opacity-90 transition-opacity touch-manipulation focus:outline-none focus-visible:ring-4 focus-visible:ring-[#F5A623]"
          style={{
            background: thumbnailUrl
              ? undefined
              : 'linear-gradient(135deg, #0B2560 0%, #1a3a7a 60%, #3B82C4 100%)',
          }}
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={headline}
              className="w-full object-cover aspect-video"
            />
          ) : (
            <div className="w-full aspect-video" />
          )}

          {/* Overlay — always visible (hover doesn't work on touch) */}
          <div className="absolute inset-0 bg-[#0B2560]/45" />

          {/* Play button + label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#F5A623] shadow-2xl shadow-[#F5A623]/50 flex items-center justify-center"
            >
              <Play
                size={28}
                className="text-[#0B2560] ml-1.5 md:hidden"
                fill="currentColor"
              />
              <Play
                size={36}
                className="text-[#0B2560] ml-1.5 hidden md:block"
                fill="currentColor"
              />
            </motion.div>
            <span className="text-white text-sm font-semibold tracking-wide">Tap to watch</span>
          </div>

          {/* Duration badge */}
          {durationLabel && (
            <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 bg-black/65 text-white text-xs font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm">
              {durationLabel}
            </div>
          )}
        </motion.div>

        {caption && (
          <p className="text-center text-xs text-gray-400 mt-3 md:mt-4">{caption}</p>
        )}
      </div>

      {/* Modal — full-screen on mobile, centred card on desktop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 md:bg-black/90 md:p-6"
            onClick={closeModal}
            role="dialog"
            aria-modal="true"
            aria-label={headline}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative w-full md:max-w-4xl md:rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button — large touch target, safe area aware */}
              <button
                onClick={closeModal}
                aria-label="Close video"
                className="absolute top-3 right-3 z-10 w-11 h-11 rounded-full bg-black/70 hover:bg-black/90 transition flex items-center justify-center text-white touch-manipulation"
                style={{ top: 'max(12px, env(safe-area-inset-top))' }}
              >
                <X size={20} />
              </button>

              <video
                ref={videoRef}
                src={videoUrl}
                controls
                playsInline
                className="w-full md:rounded-2xl block"
                style={{ maxHeight: '100dvh' }}
                aria-label={headline}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
