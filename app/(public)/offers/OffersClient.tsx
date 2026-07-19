'use client';

import { useState } from 'react';
import { OfferCard } from './OfferCard';
import OfferCategoryTabs from './components/OfferCategoryTabs';

export default function OffersClient({ offers }: { offers: any[] }) {
  const [active, setActive] = useState('All');

  const filtered = active === 'All' ? offers : offers.filter(o => o.category === active);
  const counts: Record<string, number> = { All: offers.length };
  for (const o of offers) counts[o.category] = (counts[o.category] || 0) + 1;

  return (
    <div>
      {/* Section heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3B82C4] mb-2">Current Deals</p>
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-[#0B2560]">
            {active === 'All' ? 'All Offers & Packages' : active + ' Offers'}
          </h2>
          <p className="text-gray-400 text-sm mt-1">{filtered.length} offer{filtered.length !== 1 ? 's' : ''} available</p>
        </div>
      </div>

      <OfferCategoryTabs counts={counts} active={active} onChange={setActive} />

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold">No {active} offers right now</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((offer: any) => (
            <OfferCard key={offer._id} offer={offer} />
          ))}
        </div>
      )}
    </div>
  );
}
