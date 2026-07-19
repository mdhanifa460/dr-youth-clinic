'use client';

const CATEGORIES = ['All', 'Skin Care', 'Hair Care', 'Laser', 'Body', 'Package'];

export default function OfferCategoryTabs({
  counts,
  active,
  onChange,
}: {
  counts: Record<string, number>;
  active: string;
  onChange: (cat: string) => void;
}) {
  const tabs = CATEGORIES.filter((c) => c === 'All' || (counts[c] || 0) > 0);

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-none">
      {tabs.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`shrink-0 px-4 py-2 rounded-2xl text-sm font-semibold transition-all duration-200 ${
            active === cat
              ? 'bg-[#0B2560] text-white shadow-lg shadow-[#0B2560]/20'
              : 'bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-600 hover:border-[#0B2560]/30 hover:text-[#0B2560]'
          }`}
        >
          {cat}
          <span className={`ml-1.5 text-[10px] font-bold ${active === cat ? 'text-white/70' : 'text-gray-400'}`}>
            ({counts[cat] || 0})
          </span>
        </button>
      ))}
    </div>
  );
}
