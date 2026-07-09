'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Play } from 'lucide-react';

interface VideoItem {
  _id: string;
  title: string;
  slug: string;
  category: string;
  duration?: string;
  thumbnail?: { url: string };
  doctor?: { name: string };
}

export default function AcademyClient({ videos }: { videos: VideoItem[] }) {
  const [active, setActive] = useState('All');

  const categories = useMemo(() => {
    const set = new Set(videos.map((v) => v.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [videos]);

  const counts: Record<string, number> = { All: videos.length };
  for (const v of videos) counts[v.category] = (counts[v.category] || 0) + 1;

  const filtered = active === 'All' ? videos : videos.filter((v) => v.category === active);

  return (
    <div>
      {/* Filter tabs */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`shrink-0 px-4 py-2 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                active === cat
                  ? 'bg-[#0B2560] text-white shadow-lg shadow-[#0B2560]/20'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-[#0B2560]/30 hover:text-[#0B2560]'
              }`}
            >
              {cat}
              <span className={`ml-1.5 text-[10px] font-bold ${active === cat ? 'text-white/70' : 'text-gray-400'}`}>
                ({counts[cat] || 0})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold">No {active} videos right now</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((v) => (
            <Link
              key={v._id}
              href={`/academy/${v.slug}`}
              className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                {v.thumbnail?.url ? (
                  <img
                    src={v.thumbnail.url}
                    alt={v.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0B2560] to-[#3B82C4]" />
                )}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play size={16} className="text-[#0B2560] ml-0.5" fill="currentColor" />
                  </div>
                </div>
                {v.duration && (
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                    {v.duration}
                  </span>
                )}
              </div>
              <div className="p-4">
                <span className="text-[10px] font-bold text-[#3B82C4] uppercase tracking-wider">{v.category}</span>
                <h3 className="font-headline font-bold text-[#0B2560] text-sm mt-1 leading-snug line-clamp-2">
                  {v.title}
                </h3>
                {v.doctor?.name && <p className="text-gray-400 text-xs mt-1.5">{v.doctor.name}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
