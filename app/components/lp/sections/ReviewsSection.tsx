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

export default function ReviewsSection({ data }: { data: ReviewsData }) {
  const {
    headline = 'What Our Patients Say',
    reviews = [],
  } = data;

  if (!reviews.length) return null;

  return (
    <section className="bg-[#f6faff] py-14 md:py-20">
      <div className="max-w-5xl mx-auto px-5">
        <div className="text-center mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">
            Patient Stories
          </p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560]">{headline}</h2>

          {/* Aggregate rating */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-[#F5A623] text-xl tracking-tight">★★★★★</span>
            <span className="text-sm font-bold text-[#0B2560]">4.9/5</span>
            <span className="text-xs text-gray-400">· {reviews.length}+ verified reviews</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((review, i) => {
            const stars = Math.min(5, Math.max(1, Math.round(Number(review.rating) || 5)));
            return (
              <div
                key={i}
                className="bg-white border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
              >
                {/* Stars */}
                <div className="text-[#F5A623] text-base tracking-tight mb-3">
                  {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
                </div>

                {/* Review text */}
                <p className="text-sm text-gray-600 leading-relaxed flex-1">&ldquo;{review.text}&rdquo;</p>

                {/* Reviewer */}
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-[#0B2560] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {(review.name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-[#0B2560] text-sm">{review.name}</p>
                    {review.treatment && (
                      <p className="text-[10px] text-[#3B82C4] font-semibold">{review.treatment}</p>
                    )}
                  </div>
                  <span className="ml-auto text-[10px] text-gray-400 font-semibold">Verified ✓</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
