'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CATEGORY_ICON: Record<string, string> = {
  Skin: '✨', Hair: '🌿', Laser: '⚡', Other: '🏥',
};

type RelatedService = {
  _id: string;
  name: string;
  category: string;
  location: string;
  urlSlug: string;
  price: number;
  duration: number;
  heroImage?: { url?: string };
};

function ServiceCard({ r, showPriceOnCards, arrows }: {
  r: RelatedService;
  showPriceOnCards: boolean;
  // Prev/Next controls rendered inside the image itself (mobile carousel) —
  // omitted on desktop, where paging controls live below the grid instead.
  arrows?: { onPrev: () => void; onNext: () => void; prevDisabled: boolean; nextDisabled: boolean };
}) {
  return (
    <Link href={`/${r.location}/services/${r.category.toLowerCase()}/${r.urlSlug}`} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg border border-gray-100 transition-all hover:-translate-y-1 block">
      <div className="relative h-44 overflow-hidden">
        {r.heroImage?.url ? (
          <>
            <Image src={r.heroImage.url} alt={r.name} fill sizes="33vw" className="object-cover group-hover:scale-105 transition duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0B2560] to-[#1a4a8a] flex items-center justify-center text-4xl">{CATEGORY_ICON[r.category] ?? '🏥'}</div>
        )}
        {arrows && (
          <>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); arrows.onPrev(); }}
              disabled={arrows.prevDisabled}
              aria-label="Previous treatment"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-[#0B2560] shadow-md disabled:opacity-0 transition z-10"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); arrows.onNext(); }}
              disabled={arrows.nextDisabled}
              aria-label="Next treatment"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-[#0B2560] shadow-md disabled:opacity-0 transition z-10"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-[#0B2560] mb-2 text-sm leading-snug group-hover:text-[#3B82C4] transition">{r.name}</h3>
        <div className="flex items-center justify-between text-sm">
          {showPriceOnCards && <span className="font-bold text-[#0B2560]">₹{r.price.toLocaleString('en-IN')}</span>}
          <span className="text-gray-500 text-xs">{r.duration} min</span>
        </div>
      </div>
    </Link>
  );
}

// Replaces what used to be an unbounded horizontal scroll strip (mobile) +
// static grid (desktop) with a real pager — Settings → Display's
// relatedServicesCount controls pageSize, so the admin controls how many
// cards show at once rather than that being hardcoded.
//
// Mobile and desktop use genuinely different pagers: mobile shows exactly
// one card at a time with Prev/Next arrows overlaid on the image (a swipe/
// tap carousel, one card per step through the FULL related list); desktop
// shows `pageSize` cards per page with Prev/Next + dots below the grid.
export default function RelatedServicesPager({
  related,
  pageSize,
  catLabel,
  cityName,
  location,
  catSlug,
  showPriceOnCards,
}: {
  related: RelatedService[];
  pageSize: number;
  catLabel: string;
  cityName: string;
  location: string;
  catSlug: string;
  showPriceOnCards: boolean;
}) {
  const [mobileIndex, setMobileIndex] = useState(0);
  const [page, setPage] = useState(0);
  const size = Math.max(1, pageSize);
  const totalPages = Math.ceil(related.length / size);
  const pageItems = related.slice(page * size, page * size + size);

  return (
    <section className="bg-white py-14 border-t border-gray-50">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-headline font-bold text-[#0B2560]">Related Treatments</h2>
            <p className="text-gray-500 text-sm mt-1">More {catLabel.toLowerCase()} services at our {cityName} clinic</p>
          </div>
          <Link href={`/${location}/services/${catSlug}`} className="text-sm font-semibold text-[#0B2560] hover:text-[#3b82f6] transition flex items-center gap-1.5">
            View all <ChevronRight size={14} />
          </Link>
        </div>

        {/* Mobile: one card at a time, arrows overlaid on the image */}
        <div className="sm:hidden relative">
          <ServiceCard
            r={related[mobileIndex]}
            showPriceOnCards={showPriceOnCards}
            arrows={{
              onPrev: () => setMobileIndex((i) => Math.max(0, i - 1)),
              onNext: () => setMobileIndex((i) => Math.min(related.length - 1, i + 1)),
              prevDisabled: mobileIndex === 0,
              nextDisabled: mobileIndex === related.length - 1,
            }}
          />
          {related.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {related.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setMobileIndex(i)}
                  aria-label={`Go to treatment ${i + 1}`}
                  className={`rounded-full transition-all ${
                    i === mobileIndex ? 'w-6 h-2 bg-[#0B2560]' : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Desktop: grid of `pageSize` cards per page + Prev/Next/dots below */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pageItems.map((r) => (
            <ServiceCard key={String(r._id)} r={r} showPriceOnCards={showPriceOnCards} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="hidden sm:flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous page"
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-[#0B2560] disabled:opacity-30 hover:border-[#0B2560]/40 transition"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  aria-label={`Go to page ${i + 1}`}
                  className={`rounded-full transition-all ${
                    i === page ? 'w-6 h-2 bg-[#0B2560]' : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              aria-label="Next page"
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-[#0B2560] disabled:opacity-30 hover:border-[#0B2560]/40 transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
