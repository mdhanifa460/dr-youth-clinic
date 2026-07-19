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
// content. Sidebar on desktop, horizontal-scroll rail on mobile.
export default function OfferHighlightRail({ offers }: { offers: any[] }) {
  if (offers.length === 0) return null;

  return (
    <div className="lg:sticky lg:top-24">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3B82C4] mb-3">Limited Period Offers</p>
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-6 px-6 lg:flex-col lg:overflow-visible lg:mx-0 lg:px-0 lg:gap-3">
        {offers.map((offer) => {
          const pct = discountPct(offer.originalPrice, offer.discountedPrice);
          const icon = CATEGORY_ICON[offer.category] || '🏷️';
          return (
            <Link
              key={offer._id}
              href={`/book?offer=${encodeURIComponent(offer.title)}`}
              className="offer-gradient-border snap-start shrink-0 w-64 lg:w-full rounded-2xl overflow-hidden flex items-center gap-3 p-3 hover:shadow-md transition-shadow duration-200 bg-white"
            >
              <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[#3B82C4] to-[#0B2560]">
                {offer.image?.url ? (
                  <Image src={offer.image.url} alt={offer.title} fill sizes="56px" className="object-cover" />
                ) : (
                  <span className="flex items-center justify-center h-full text-xl">{icon}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#0B2560] leading-snug truncate">{offer.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {pct > 0 && <span className="text-[10px] font-extrabold text-green-600">Save {pct}%</span>}
                  <span className="text-xs font-bold text-gray-700">₹{offer.discountedPrice?.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
