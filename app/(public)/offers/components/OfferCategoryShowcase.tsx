import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const CATEGORY_LIST = ['Skin Care', 'Hair Care', 'Laser', 'Body', 'Package'];

const CATEGORY_GRADIENTS: Record<string, string> = {
  'Skin Care': 'from-pink-400 to-rose-500',
  'Hair Care': 'from-emerald-400 to-teal-500',
  'Laser':     'from-violet-400 to-purple-600',
  'Body':      'from-orange-400 to-amber-500',
  'Package':   'from-[#3B82C4] to-[#0B2560]',
};

const CATEGORY_ICON: Record<string, string> = {
  'Skin Care': '✨',
  'Hair Care': '🌿',
  'Laser':     '⚡',
  'Body':      '💆',
  'Package':   '🎁',
};

export interface CategorySummary {
  category: string;
  count: number;
  startingFrom: number | null;
  maxDiscount: number;
}

// Always renders all 5 categories, regardless of how many real offers exist
// in each — this is the fix for the "looks empty with 1 offer" problem: a
// flat one-card-per-offer grid looks sparse with little data, but a
// one-card-per-category showcase always looks intentional and complete.
// Categories with zero active offers get an honest "Ask about pricing"
// state instead of a fabricated price.
export default function OfferCategoryShowcase({ summaries }: { summaries: CategorySummary[] }) {
  const byCategory = new Map(summaries.map((s) => [s.category, s]));

  return (
    <section className="bg-white py-14 md:py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-2">Browse by Category</p>
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-[#0B2560]">Find Your Perfect Treatment</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-5">
          {CATEGORY_LIST.map((cat) => {
            const summary = byCategory.get(cat);
            const hasOffers = !!summary && summary.count > 0;
            const gradient = CATEGORY_GRADIENTS[cat];
            const icon = CATEGORY_ICON[cat];

            return (
              <Link
                key={cat}
                href="#offers"
                className="offer-gradient-border group relative rounded-3xl overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white"
              >
                <div className={`relative h-24 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                  <span className="text-4xl opacity-90">{icon}</span>
                  {hasOffers && summary!.maxDiscount > 0 && (
                    <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-green-600 text-[10px] font-extrabold px-2 py-1 rounded-full">
                      Up to {summary!.maxDiscount}% off
                    </span>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-extrabold text-[#0B2560] text-sm mb-1">{cat}</h3>
                  {hasOffers ? (
                    <p className="text-xs text-gray-500 mb-3">
                      {summary!.count} offer{summary!.count !== 1 ? 's' : ''} · From <span className="font-bold text-[#0B2560]">₹{summary!.startingFrom?.toLocaleString('en-IN')}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mb-3">Ask about pricing at your consultation</p>
                  )}
                  <div className="flex-1" />
                  <span className="inline-flex items-center gap-1 text-[#3B82C4] text-xs font-bold group-hover:text-[#0B2560] transition-colors">
                    {hasOffers ? 'View Offers' : 'Learn More'} <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
