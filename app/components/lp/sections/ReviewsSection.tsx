'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

interface ReviewItem {
  name?: string;
  rating?: number;
  text?: string;
  treatment?: string;
}

interface ReviewsData {
  headline?: string;
  subtitle?: string;
  reviews?: ReviewItem[];
}

function nameToColor(name: string): string {
  const palette = ['#0B2560', '#3B82C4', '#1a3a7a', '#2563eb'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function ReviewCard({ review }: { review: ReviewItem }) {
  const stars = Math.min(5, Math.max(1, Math.round(Number(review.rating) || 5)));
  const name = review.name || 'Anonymous';
  const color = nameToColor(name);

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 text-white"
          style={{ background: color }}
        >
          {getInitials(name)}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-[#0B2560] text-sm truncate">{name}</p>
          {review.treatment && (
            <span className="inline-block mt-0.5 text-[10px] bg-[#3B82C4]/10 text-[#3B82C4] font-semibold px-2 py-0.5 rounded-full">
              {review.treatment}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-0.5 mb-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} size={15} className={i < stars ? 'text-[#F5A623]' : 'text-gray-200'} fill={i < stars ? '#F5A623' : 'none'} />
        ))}
      </div>
      <p className="text-sm text-gray-600 leading-relaxed flex-1 line-clamp-4">&ldquo;{review.text}&rdquo;</p>
    </div>
  );
}

export default function ReviewsSection({ data }: { data: ReviewsData }) {
  const {
    headline = 'What Our Patients Say',
    subtitle = 'Real stories from real patients across our clinics.',
    reviews = [],
  } = data;

  const [perView, setPerView] = useState(3);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const onResize = () => setPerView(window.innerWidth < 768 ? 1 : 3);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const maxIndex = Math.max(0, reviews.length - perView);

  useEffect(() => {
    if (index > maxIndex) setIndex(maxIndex);
  }, [maxIndex, index]);

  const go = (dir: 1 | -1) => {
    setDirection(dir);
    setIndex((i) => {
      const next = i + dir;
      if (next < 0) return maxIndex;
      if (next > maxIndex) return 0;
      return next;
    });
  };

  useEffect(() => {
    if (paused || reviews.length <= perView) return;
    const t = setInterval(() => go(1), 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, reviews.length, perView, maxIndex]);

  if (!reviews.length) return null;

  const visible = reviews.slice(index, index + perView);
  const canNavigate = reviews.length > perView;

  return (
    <section className="bg-[#f6faff] py-14 md:py-20">
      <div className="max-w-6xl mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">Patient Stories</p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560]">{headline}</h2>
          <p className="text-gray-500 mt-3 text-sm md:text-base max-w-xl mx-auto">{subtitle}</p>
        </motion.div>

        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={index}
                custom={direction}
                initial={{ opacity: 0, x: direction * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -60 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="grid gap-5"
                style={{ gridTemplateColumns: `repeat(${perView}, minmax(0, 1fr))` }}
              >
                {visible.map((review, i) => (
                  <ReviewCard key={index + i} review={review} />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {canNavigate && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => go(-1)}
                aria-label="Previous reviews"
                className="w-11 h-11 rounded-full border-2 border-[#0B2560]/20 text-[#0B2560] flex items-center justify-center hover:bg-[#0B2560] hover:text-white hover:border-[#0B2560] transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: maxIndex + 1 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-[#F5A623]' : 'w-2 bg-[#0B2560]/20'}`}
                  />
                ))}
              </div>
              <button
                onClick={() => go(1)}
                aria-label="Next reviews"
                className="w-11 h-11 rounded-full border-2 border-[#0B2560]/20 text-[#0B2560] flex items-center justify-center hover:bg-[#0B2560] hover:text-white hover:border-[#0B2560] transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
