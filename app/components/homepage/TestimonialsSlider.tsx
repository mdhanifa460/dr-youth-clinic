'use client';

import { useState, useEffect, useCallback } from 'react';
import { AiFillStar, AiOutlineStar } from 'react-icons/ai';
import { FaGoogle, FaPlay } from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SOURCE_CONFIG: Record<string, { label: string; bg: string; color: string; Icon: React.ElementType }> = {
  google: { label: 'Google',          bg: '#EA4335', color: '#fff', Icon: FaGoogle   },
  manual: { label: 'Verified Patient', bg: '#0B2560', color: '#fff', Icon: MdVerified },
  video:  { label: 'Video Review',     bg: '#F5A623', color: '#fff', Icon: FaPlay     },
};
const getSourceConfig = (s: string) =>
  SOURCE_CONFIG[s] ?? { label: s, bg: '#6B7280', color: '#fff', Icon: MdVerified };

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) =>
        n <= rating
          ? <AiFillStar key={n} className="text-[#F5A623]" size={16} />
          : <AiOutlineStar key={n} className="text-gray-300" size={16} />
      )}
    </div>
  );
}

function ReviewCard({ review, showSourceBadges, showDate }: { review: any; showSourceBadges: boolean; showDate: boolean }) {
  const src = getSourceConfig(review.source);
  const SrcIcon = src.Icon;
  const initials = review.authorName?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className="bg-white rounded-2xl p-7 shadow-[0_4px_24px_rgba(11,37,96,0.07)] flex flex-col gap-4 h-full border border-gray-100">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {showSourceBadges && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide px-2.5 py-1 rounded-full"
            style={{ background: src.bg, color: src.color }}>
            <SrcIcon size={10} />
            {src.label}
          </span>
        )}
        {review.rating && <Stars rating={review.rating} />}
      </div>

      {review.source === 'video' && review.videoUrl && (
        <a href={review.videoUrl} target="_blank" rel="noopener noreferrer"
          className="relative rounded-xl overflow-hidden aspect-video bg-gray-100 flex items-center justify-center group">
          {review.videoThumbnail
            ? <img src={review.videoThumbnail} alt="video" className="w-full h-full object-cover" />
            : <div className="absolute inset-0 bg-gradient-to-br from-[#0B2560] to-[#1a4a8a]" />}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition" />
          <div className="relative z-10 w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition">
            <FaPlay className="text-[#0B2560] ml-1" size={16} />
          </div>
        </a>
      )}

      {review.reviewText && (
        <p className="text-gray-700 text-sm leading-relaxed italic flex-1">
          &ldquo;{review.reviewText}&rdquo;
        </p>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
        {review.authorAvatar
          ? <img src={review.authorAvatar} alt={review.authorName} className="w-9 h-9 rounded-full object-cover shrink-0" />
          : <div className="w-9 h-9 rounded-full bg-[#0B2560] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>}
        <div className="min-w-0">
          <p className="text-[#0B2560] font-bold text-sm truncate">{review.authorName}</p>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
            {review.location && <span className="text-gray-400 text-xs capitalize">{review.location}</span>}
            {review.services?.[0] && <span className="text-[#3B82C4] text-xs">{review.services[0]}</span>}
            {showDate && review.reviewDate && (
              <span className="text-gray-300 text-xs">
                {new Date(review.reviewDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="bg-white rounded-2xl p-7 border border-gray-100 animate-pulse space-y-4">
      <div className="flex gap-2">
        <div className="h-5 w-20 rounded-full bg-gray-200" />
        <div className="h-5 w-24 rounded-full bg-gray-200" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-gray-100" />
        <div className="h-3 w-5/6 rounded bg-gray-100" />
        <div className="h-3 w-4/6 rounded bg-gray-100" />
      </div>
      <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
        <div className="w-9 h-9 rounded-full bg-gray-200" />
        <div className="space-y-1">
          <div className="h-3 w-24 rounded bg-gray-200" />
          <div className="h-2.5 w-16 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

export default function TestimonialsSlider({ data }: { data: any }) {
  const {
    headline = 'What Our Patients Say',
    subheadline = 'Real stories. Real results. Real confidence.',
    layout = 'slider',
    displayCount = 6,
    filterSource = '',
    filterLocation = '',
    filterService = '',
    showSourceBadges = true,
    showDate = false,
    // Server-prefetched reviews injected by the server component (page.tsx).
    // When present, skip the client-side fetch entirely — zero extra HTTP request.
    _reviews,
  } = data || {};

  const [reviews, setReviews] = useState<any[]>(_reviews ?? []);
  const [loading, setLoading] = useState(!_reviews);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    // Skip fetch if the server already supplied reviews
    if (_reviews) return;

    const params = new URLSearchParams({ count: String(displayCount) });
    if (filterSource) params.set('source', filterSource);
    if (filterLocation) params.set('location', filterLocation);
    if (filterService) params.set('service', filterService);

    fetch(`/api/reviews?${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setReviews(d.reviews); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [_reviews, displayCount, filterSource, filterLocation, filterService]);

  const prev = useCallback(() => setIdx((i) => (i - 1 + reviews.length) % reviews.length), [reviews.length]);
  const next = useCallback(() => setIdx((i) => (i + 1) % reviews.length), [reviews.length]);

  if (!loading && reviews.length === 0) return null;

  return (
    <section id="testimonials" className="py-20 bg-[#f6faff]">
      <div className="max-w-7xl mx-auto px-6 md:px-10">

        <div className="text-center mb-12">
          <p className="text-[#F5A623] font-bold text-xs tracking-[0.2em] uppercase mb-3">Patient Reviews</p>
          <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-[#0B2560]">{headline}</h2>
          <p className="text-gray-500 mt-3 text-sm">{subheadline}</p>
        </div>

        {layout === 'slider' && (
          loading ? (
            <div className="max-w-2xl mx-auto"><Skeleton /></div>
          ) : (
            <div className="relative max-w-2xl mx-auto">
              <button onClick={prev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 md:-translate-x-12 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-[#0B2560] hover:bg-[#0B2560] hover:text-white transition z-10 border border-gray-100">
                <ChevronLeft size={18} />
              </button>

              <ReviewCard review={reviews[idx]} showSourceBadges={showSourceBadges} showDate={showDate} />

              <button onClick={next}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 md:translate-x-12 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-[#0B2560] hover:bg-[#0B2560] hover:text-white transition z-10 border border-gray-100">
                <ChevronRight size={18} />
              </button>

              <div className="flex justify-center gap-2 mt-6">
                {reviews.map((_, i) => (
                  <button key={i} onClick={() => setIdx(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${i === idx ? 'w-6 bg-[#0B2560]' : 'w-2 bg-gray-300'}`} />
                ))}
              </div>
            </div>
          )
        )}

        {layout === 'grid' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} />)
              : reviews.map((r, i) => (
                  <ReviewCard key={r._id ?? i} review={r} showSourceBadges={showSourceBadges} showDate={showDate} />
                ))}
          </div>
        )}

      </div>
    </section>
  );
}
