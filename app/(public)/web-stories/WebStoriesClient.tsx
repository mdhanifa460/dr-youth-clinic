'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Play } from 'lucide-react';

const SORTS = [
  { key: 'latest', label: 'Latest' },
  { key: 'trending', label: 'Trending' },
  { key: 'featured', label: 'Featured' },
  { key: 'editorsPick', label: "Editor's Pick" },
];

const PAGE_SIZE = 12;

function StoryCard({ story }: { story: any }) {
  return (
    <Link href={`/web-stories/${story.slug}`} className="group block">
      <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-gradient-to-br from-[#0B2560] to-[#1a4a8a] shadow-sm group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300">
        {story.coverImage?.url ? (
          <Image src={story.coverImage.url} alt={story.title} fill sizes="240px" className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl opacity-70">{story.storyType?.icon || '📱'}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        {story.storyType && (
          <span className="absolute top-2.5 left-2.5 text-[9px] font-bold uppercase tracking-wide bg-white/90 text-[#0B2560] px-2 py-1 rounded-full">
            {story.storyType.icon} {story.storyType.name}
          </span>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
            <Play size={14} className="text-[#0B2560] fill-[#0B2560]" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-xs font-bold leading-snug line-clamp-2">{story.title}</p>
        </div>
      </div>
    </Link>
  );
}

export default function WebStoriesClient({ stories, types }: { stories: any[]; types: any[] }) {
  const [sort, setSort] = useState('latest');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const featured = useMemo(() => stories.filter(s => s.featured).slice(0, 5), [stories]);

  const filtered = useMemo(() => {
    let list = [...stories];
    if (typeFilter) list = list.filter(s => s.storyType?._id === typeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(s => s.title?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q) || (s.tags || []).some((t: string) => t.toLowerCase().includes(q)));
    }
    if (sort === 'trending') list.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    else if (sort === 'featured') list = list.filter(s => s.featured);
    else if (sort === 'editorsPick') list = list.filter(s => s.editorsPick);
    else list.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
    return list;
  }, [stories, typeFilter, search, sort]);

  const paged = filtered.slice(0, visible);

  return (
    <main className="bg-white min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0B2560] via-[#102d6e] to-[#1a4a8a] text-white py-14 md:py-20 relative overflow-hidden">
        <div className="pointer-events-none absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#F5A623]/10 blur-[120px]" />
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-6 h-[2px] bg-[#F5A623]" />
            <span className="text-[#F5A623] text-xs font-bold tracking-[0.22em] uppercase">Web Stories</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-headline font-extrabold leading-tight mb-4 max-w-2xl">
            Real Journeys, Told in Seconds
          </h1>
          <p className="text-white/70 text-sm md:text-base max-w-xl leading-relaxed">
            Swipe through quick visual stories on treatments, transformations, offers, and patient journeys.
          </p>
        </div>
      </section>

      {/* Featured strip */}
      {featured.length > 0 && (
        <section className="py-8 border-b border-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Featured</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
              {featured.map(s => (
                <div key={s._id} className="w-36 shrink-0"><StoryCard story={s} /></div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input value={search} onChange={e => { setSearch(e.target.value); setVisible(PAGE_SIZE); }} placeholder="Search stories..."
              className="w-full border border-gray-200 rounded-full pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {SORTS.map(s => (
              <button key={s.key} onClick={() => { setSort(s.key); setVisible(PAGE_SIZE); }}
                className={`shrink-0 text-xs font-bold px-3.5 py-2 rounded-full transition ${sort === s.key ? 'bg-[#0B2560] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {types.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-8">
            <button onClick={() => { setTypeFilter(''); setVisible(PAGE_SIZE); }}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition ${!typeFilter ? 'bg-[#F5A623] text-[#0B2560]' : 'bg-white border border-gray-200 text-gray-500'}`}>
              All Types
            </button>
            {types.map((t: any) => (
              <button key={t._id} onClick={() => { setTypeFilter(t._id); setVisible(PAGE_SIZE); }}
                className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition ${typeFilter === t._id ? 'bg-[#F5A623] text-[#0B2560]' : 'bg-white border border-gray-200 text-gray-500'}`}>
                {t.icon} {t.name}
              </button>
            ))}
          </div>
        )}

        {paged.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📱</p>
            <p className="text-gray-500 font-medium">No stories found.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5">
              {paged.map(s => <StoryCard key={s._id} story={s} />)}
            </div>
            {visible < filtered.length && (
              <div className="text-center mt-10">
                <button onClick={() => setVisible(v => v + PAGE_SIZE)}
                  className="bg-[#0B2560] text-white px-8 py-3 rounded-xl font-bold text-sm hover:-translate-y-0.5 transition">
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
