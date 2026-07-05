'use client';

import { useState, useRef } from 'react';
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
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!videoUrl) return null;

  const closeModal = () => {
    setOpen(false);
    videoRef.current?.pause();
  };

  if (autoplayMuted) {
    return (
      <section className="bg-[#0B2560] py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-3">{badge}</p>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white">{headline}</h2>
            {subtitle && <p className="text-white/60 mt-3 text-sm md:text-base max-w-xl mx-auto">{subtitle}</p>}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-[#F5A623]/20"
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
          {caption && <p className="text-center text-xs text-white/40 mt-4">{caption}</p>}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="max-w-5xl mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">{badge}</p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560]">{headline}</h2>
          {subtitle && <p className="text-gray-500 mt-3 text-sm md:text-base max-w-xl mx-auto">{subtitle}</p>}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.2 }}
          onClick={() => setOpen(true)}
          className="relative cursor-pointer group rounded-3xl overflow-hidden shadow-2xl"
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

          <div className="absolute inset-0 bg-[#0B2560]/40 group-hover:bg-[#0B2560]/55 transition-colors duration-300" />

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-20 h-20 rounded-full bg-[#F5A623] shadow-2xl shadow-[#F5A623]/40 flex items-center justify-center"
            >
              <Play size={32} className="text-[#0B2560] ml-1.5" fill="currentColor" />
            </motion.div>
            <span className="text-white/80 text-sm font-semibold">Tap to watch</span>
          </div>

          <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
            0:10
          </div>
        </motion.div>

        {caption && <p className="text-center text-xs text-gray-400 mt-4">{caption}</p>}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeModal}
                className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 transition flex items-center justify-center text-white"
              >
                <X size={18} />
              </button>
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                autoPlay
                playsInline
                className="w-full rounded-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
