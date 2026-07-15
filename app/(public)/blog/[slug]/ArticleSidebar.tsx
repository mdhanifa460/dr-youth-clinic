'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, ChevronDown } from 'lucide-react';
import type { Heading } from '@/app/lib/blogMarkdown';
import { useSiteConfig } from '@/app/components/SiteConfigContext';

function useActiveHeading(headings: Heading[]) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    if (headings.length === 0) return;
    const els = headings.map((h) => document.getElementById(h.id)).filter(Boolean) as HTMLElement[];

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActiveId(e.target.id); });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [headings]);

  return activeId;
}

function TocNav({ headings, activeId, onNavigate }: { headings: Heading[]; activeId: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1">
      {headings.map((h) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          onClick={onNavigate}
          className={`block text-sm leading-snug py-1 transition-all duration-200 border-l-2 ${
            h.level === 3 ? 'pl-5' : 'pl-3'
          } ${
            activeId === h.id
              ? 'border-[#F5A623] text-[#0B2560] font-semibold'
              : 'border-transparent text-gray-400 hover:text-[#0B2560] hover:border-gray-200'
          }`}
        >
          {h.text}
        </a>
      ))}
    </nav>
  );
}

// Desktop sticky sidebar — unchanged from before, still rendered by the
// parent only inside a `hidden lg:block` wrapper.
export default function ArticleSidebar({ headings }: { headings: Heading[] }) {
  const siteConfig = useSiteConfig();
  const activeId = useActiveHeading(headings);

  return (
    <div className="space-y-4">
      {headings.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-4">In This Article</p>
          <TocNav headings={headings} activeId={activeId} />
        </div>
      )}

      {/* Book CTA */}
      <div className="bg-[#0B2560] rounded-2xl p-5 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">Ready to Begin?</p>
        <p className="text-sm font-bold leading-snug mb-1">{siteConfig.consultationBadge}</p>
        <p className="text-xs text-white/60 mb-4">Talk to our specialists — no commitment, honest advice.</p>
        <Link href="/book" className="flex items-center justify-center gap-2 bg-[#F5A623] text-[#0B2560] py-2.5 rounded-xl font-extrabold text-xs hover:-translate-y-0.5 transition">
          <Calendar size={13} /> Book Now
        </Link>
      </div>
    </div>
  );
}

// Mobile TOC — a collapsible "Jump to section" bar, rendered by the parent
// only inside a `lg:hidden` wrapper just above the article body. Reuses the
// same headings prop / IntersectionObserver active-tracking as the desktop
// sidebar so scroll position stays in sync regardless of viewport.
export function MobileArticleToc({ headings }: { headings: Heading[] }) {
  const [open, setOpen] = useState(false);
  const activeId = useActiveHeading(headings);

  if (headings.length === 0) return null;

  return (
    <div className="mb-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
      >
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">In This Article</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-4">
          <TocNav headings={headings} activeId={activeId} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
