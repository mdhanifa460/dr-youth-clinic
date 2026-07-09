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
  featured?: boolean;
  thumbnail?: { url: string };
  doctor?: { name: string };
}

interface Data {
  headline?: string;
  subheadline?: string;
  videos?: VideoItem[];
}

export default function VideoAcademySection({ data }: { data: Data }) {
  const { headline = 'Skin & Hair Academy', subheadline, videos = [] } = data;
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = useMemo(() => {
    const set = new Set(videos.map((v) => v.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [videos]);

  const featured = videos.find((v) => v.featured) ?? videos[0];
  const rest = videos.filter((v) => v._id !== featured?._id);
  const filtered = activeCategory === 'All' ? rest : rest.filter((v) => v.category === activeCategory);

  if (!videos.length) return null;

  return (
    <section id="academy" className="bg-white py-16 md:py-24 px-6 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[#3B82C4] font-bold text-xs tracking-[0.2em] uppercase mb-3">🎥 Video Academy</p>
          <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-[#0B2560]">{headline}</h2>
          {subheadline && <p className="text-gray-600 mt-3 max-w-xl mx-auto">{subheadline}</p>}
        </div>

        {featured && (
          <Link
            href={`/academy/${featured.slug}`}
            className="group block rounded-3xl overflow-hidden shadow-[0_12px_48px_rgba(0,32,69,0.12)] mb-10 relative bg-[#0B2560]"
          >
            <div className="relative aspect-video sm:aspect-[21/9]">
              {featured.thumbnail?.url ? (
                <img
                  src={featured.thumbnail.url}
                  alt={featured.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#0B2560] to-[#3B82C4]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <Play size={28} className="text-[#0B2560] ml-1" fill="currentColor" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <span className="inline-block bg-[#F5A623] text-[#0B2560] text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
                  Featured
                </span>
                <h3 className="text-white text-xl md:text-3xl font-headline font-extrabold leading-tight">{featured.title}</h3>
                <p className="text-white/70 text-sm mt-2 flex items-center gap-3">
                  {featured.duration && <span>{featured.duration}</span>}
                  {featured.doctor?.name && <span>· {featured.doctor.name}</span>}
                </p>
              </div>
            </div>
          </Link>
        )}

        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeCategory === c
                    ? 'bg-[#0B2560] text-white shadow-md'
                    : 'bg-[#f6faff] text-gray-600 hover:bg-[#e8eff7]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.slice(0, 6).map((v) => (
            <Link
              key={v._id}
              href={`/academy/${v.slug}`}
              className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                {v.thumbnail?.url ? (
                  <img src={v.thumbnail.url} alt={v.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0B2560] to-[#3B82C4]" />
                )}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
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
                <h3 className="font-headline font-bold text-[#0B2560] text-sm mt-1 leading-snug line-clamp-2">{v.title}</h3>
                {v.doctor?.name && <p className="text-gray-400 text-xs mt-1.5">{v.doctor.name}</p>}
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/academy"
            className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-8 py-3.5 rounded-xl font-semibold shadow-[0_8px_24px_rgba(0,32,69,0.2)] hover:-translate-y-0.5 transition"
          >
            Watch More Videos →
          </Link>
        </div>
      </div>
    </section>
  );
}
