import Link from 'next/link';
import Image from 'next/image';
import { discountPct } from '../OfferCard';

const CATEGORY_ICON: Record<string, string> = {
  'Skin Care': '✨',
  'Hair Care': '🌿',
  'Laser':     '⚡',
  'Body':      '💆',
  'Package':   '🎁',
};

// Satisfies the "OfferCarousel" ask honestly: a real-data top-4 rail (by
// `featured` then discount %), not an autoplay slider with fabricated
// content. Lives inside the dark-navy hero (see OfferHero.tsx) — glass
// cards suited to that background, horizontal-scroll on mobile /
// vertical stack on desktop (the hero's right column is a fixed-width
// single column, not a page-length sidebar, so no sticky positioning
// needed here).
export default function OfferHighlightRail({ offers }: { offers: any[] }) {
  if (offers.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5A623] mb-3">Limited Period Offers</p>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 lg:flex-col lg:overflow-visible">
        {offers.map((offer) => {
          const pct = discountPct(offer.originalPrice, offer.discountedPrice);
          const icon = CATEGORY_ICON[offer.category] || '🏷️';
          return (
            <Link
              key={offer._id}
              href={`/book?offer=${encodeURIComponent(offer.title)}`}
              className="snap-start shrink-0 w-60 lg:w-full rounded-2xl overflow-hidden flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm border border-white/15 hover:bg-white/15 transition-colors duration-200"
            >
              <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[#3B82C4] to-[#F5A623]">
                {offer.image?.url ? (
                  <Image src={offer.image.url} alt={offer.title} fill sizes="48px" className="object-cover" />
                ) : (
                  <span className="flex items-center justify-center h-full text-lg">{icon}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white leading-snug truncate">{offer.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {pct > 0 && <span className="text-[10px] font-extrabold text-[#F5A623]">Save {pct}%</span>}
                  <span className="text-xs font-bold text-white/70">₹{offer.discountedPrice?.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
