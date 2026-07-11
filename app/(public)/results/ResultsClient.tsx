'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import SliderCard from '@/app/components/SliderCard';

const FALLBACK_PAIRS = [
  { title: 'Acne Therapy & Scar Solution', description: 'Treatments that smooth, clarify & restore natural skin texture.', category: 'Skin Care' },
  { title: 'Hairfall & Scalp Restoration', description: 'Targeted care for stronger, healthier hair & nourished roots.', category: 'Hair' },
  { title: 'Laser Skin Brightening', description: 'Advanced laser therapy for pigmentation and uneven tone.', category: 'Laser' },
  { title: 'Anti-Aging Skin Renewal', description: 'Collagen-boosting treatments for firmer, youthful skin.', category: 'Skin Care' },
  { title: 'PRP Hair Restoration', description: 'Platelet-rich plasma therapy for dense, healthy regrowth.', category: 'Hair' },
  { title: 'Laser Acne Scar Removal', description: 'Precise fractional laser for smooth, scar-free skin.', category: 'Laser' },
];

const CATEGORIES = ['All', 'Skin Care', 'Hair', 'Laser', 'Acne & Scars'];

const FALLBACK_STATS = [
  { value: '98%', label: 'Patient satisfaction' },
  { value: '10K+', label: 'Treatments done' },
  { value: '22+', label: 'Years of care' },
  { value: '4', label: 'Clinic locations' },
];

interface Props {
  pairs: any[];
  headline: string;
  subheadline: string;
  stats?: { value: string; label: string }[];
}

export default function ResultsClient({ pairs, headline, subheadline, stats }: Props) {
  const allPairs = pairs.length > 0 ? pairs : FALLBACK_PAIRS;
  const STATS = stats && stats.length > 0 ? stats : FALLBACK_STATS;
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? allPairs
    : allPairs.filter((p: any) => (p.category ?? '').toLowerCase() === activeCategory.toLowerCase());

  return (
    <main className="bg-[#F5F1EC] min-h-screen">

      {/* HERO HEADER */}
      <section className="bg-[#0B2560] text-white py-14 md:py-20 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0B2560] to-[#1a4a8a]" />
        <div className="pointer-events-none absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#F5A623]/10 blur-[120px]" />

        <div className="max-w-7xl mx-auto px-6 md:px-10 relative">
          {/* Breadcrumb */}
          <Link href="/" className="inline-flex items-center gap-1.5 text-white/60 text-sm hover:text-white transition mb-6">
            <ChevronLeft size={15} />
            Back to Home
          </Link>

          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-6 h-[2px] bg-[#F5A623]" />
            <span className="text-[#F5A623] text-xs font-bold tracking-[0.22em] uppercase">Patient Results</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-headline font-extrabold leading-tight mb-4">
            {headline}
          </h1>
          <p className="text-white/70 text-sm md:text-base max-w-xl leading-relaxed">{subheadline}</p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10 pt-10 border-t border-white/10">
            {STATS.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl md:text-3xl font-headline font-extrabold text-white">{s.value}</p>
                <p className="text-white/50 text-xs mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FILTER + GRID */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-12">

        {/* Drag hint */}
        <div className="mb-6">
          <span className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-[#EBE8E3] rounded-full px-4 py-2 text-xs text-[#9CA3AF] font-medium shadow-sm">
            <svg width="15" height="10" viewBox="0 0 15 10" fill="none">
              <path d="M1 5H14M1 5L3.5 2.5M1 5L3.5 7.5M14 5L11.5 2.5M14 5L11.5 7.5" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Drag the slider on each card to compare
          </span>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition ${
                activeCategory === cat
                  ? 'bg-[#0B2560] text-white shadow-[0_4px_14px_rgba(11,37,96,0.2)]'
                  : 'bg-white text-[#9CA3AF] border border-[#EBE8E3] hover:border-[#0B2560]/30 hover:text-[#0B2560]'
              }`}
            >
              {cat}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400 self-center">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-gray-500 font-medium">No results in this category yet.</p>
            <button onClick={() => setActiveCategory('All')} className="mt-4 text-[#3B82C4] text-sm underline">
              View all
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((pair: any, i: number) => (
              <SliderCard key={i} pair={pair} />
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-16 bg-[#0B2560] rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-headline font-extrabold mb-2">Ready for Your Transformation?</h2>
          <p className="text-white/60 text-sm mb-6">Book a consultation and get a personalised treatment plan.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/book">
              <button className="bg-[#F5A623] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#e09610] transition">
                Book Consultation
              </button>
            </Link>
            <Link href="/">
              <button className="border border-white/30 text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/10 transition">
                Back to Home
              </button>
            </Link>
          </div>
        </div>

      </section>
    </main>
  );
}
