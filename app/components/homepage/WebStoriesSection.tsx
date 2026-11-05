'use client';

import Link from 'next/link';
import ImageWithFallback from '@/app/components/media/ImageWithFallback';
import { ChevronRight, Play } from 'lucide-react';

interface StoryItem {
  _id: string;
  title: string;
  slug: string;
  coverImage?: { url: string };
  storyType?: { name: string; icon: string };
}

interface Data {
  headline?: string;
  subheadline?: string;
  stories?: StoryItem[];
}

export default function WebStoriesSection({ data }: { data: Data }) {
  const { headline = 'Web Stories', subheadline = 'Quick visual stories on treatments, transformations, and offers.', stories = [] } = data;

  if (!stories.length) return null;

  return (
    <section id="web-stories" className="bg-[#F5F1EC] py-14 md:py-20 px-6 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-6 h-[2px] bg-champagne" />
              <span className="text-bronze text-xs font-bold tracking-[0.22em] uppercase">Web Stories</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-primary">{headline}</h2>
            <p className="text-text-secondary text-sm mt-1.5 max-w-md">{subheadline}</p>
          </div>
          <Link href="/web-stories" className="text-sm font-semibold text-primary hover:text-[#3b82f6] transition flex items-center gap-1.5 shrink-0">
            View all <ChevronRight size={14} />
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0 scrollbar-hide">
          {stories.map((s) => (
            <Link key={s._id} href={`/web-stories/${s.slug}`} className="group shrink-0 w-32 md:w-36">
              <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-[#1a4a8a] shadow-sm group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300">
                <ImageWithFallback
                  src={s.coverImage?.url}
                  alt=""
                  fill
                  sizes="150px"
                  className="object-cover"
                  fallback={<div className="w-full h-full flex items-center justify-center text-3xl opacity-70">{s.storyType?.icon || '📱'}</div>}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                    <Play size={12} className="text-primary fill-primary" />
                  </div>
                </div>
                <p className="absolute bottom-2 left-2 right-2 text-white text-xs font-bold leading-snug line-clamp-2">{s.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
