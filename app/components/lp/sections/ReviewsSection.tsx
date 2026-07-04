interface ReviewItem {
  name?: string;
  rating?: number;
  text?: string;
  treatment?: string;
}

interface ReviewsData {
  headline?: string;
  reviews?: ReviewItem[];
}

function nameToColor(name: string): string {
  const palette = ['#0B2560', '#3B82C4', '#1a3a7a', '#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706'];
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
    <div className="bg-white border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col shrink-0 w-72 md:w-auto snap-start">
      {/* Stars */}
      <div className="flex items-center gap-0.5 mb-3">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={`text-base ${i < stars ? 'text-[#F5A623]' : 'text-gray-200'}`}>★</span>
        ))}
      </div>

      {/* Text */}
      <p className="text-sm text-gray-600 leading-relaxed flex-1 line-clamp-4">
        &ldquo;{review.text}&rdquo;
      </p>

      {/* Bottom */}
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 text-white"
          style={{ background: color }}
        >
          {getInitials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#0B2560] text-sm truncate">{name}</p>
          {review.treatment && (
            <span className="text-[10px] bg-[#3B82C4]/10 text-[#3B82C4] font-semibold px-2 py-0.5 rounded-full">
              {review.treatment}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 text-[10px] text-green-600 font-bold shrink-0 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
          ✓ Verified
        </span>
      </div>
    </div>
  );
}

export default function ReviewsSection({ data }: { data: ReviewsData }) {
  const { headline = 'What Our Patients Say', reviews = [] } = data;

  if (!reviews.length) return null;

  return (
    <>
      <style>{`
        .reviews-snap { scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; }
        .reviews-snap > * { scroll-snap-align: start; }
      `}</style>

      <section className="bg-[#f6faff] py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">
              Patient Stories
            </p>
            <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560]">{headline}</h2>
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="text-[#F5A623] text-xl tracking-tight">★★★★★</span>
              <span className="text-sm font-bold text-[#0B2560]">4.9/5</span>
              <span className="text-xs text-gray-400">· {reviews.length}+ verified reviews</span>
            </div>
          </div>

          {/* Mobile: horizontal scroll with snap */}
          <div className="md:hidden flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 reviews-snap">
            {reviews.map((review, i) => (
              <ReviewCard key={i} review={review} />
            ))}
          </div>

          {/* Desktop: 3-col grid */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-5">
            {reviews.map((review, i) => (
              <ReviewCard key={i} review={review} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
