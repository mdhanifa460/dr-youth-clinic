import Link from 'next/link';
import { Tag } from 'lucide-react';
import OfferHeroStats from './OfferHeroStats';

export default function OfferHero({
  activeOfferCount,
  maxSave,
  cityCount,
  patientsCount,
  ratingValue,
  consultationBadge,
}: {
  activeOfferCount: number;
  maxSave: number;
  cityCount: number;
  patientsCount: string;
  ratingValue: string;
  consultationBadge: string;
}) {
  const stats = [
    { icon: '🏷️', label: 'Active Offers', value: `${activeOfferCount}+` },
    { icon: '💰', label: 'Max Savings', value: maxSave > 0 ? `${maxSave}%` : 'Up to 50%' },
    { icon: '🏥', label: 'Clinics', value: `${cityCount} Cities` },
    { icon: '⭐', label: 'Patient Rating', value: `${ratingValue}/5` },
  ];

  return (
    <section className="relative bg-[#0B2560] overflow-hidden">
      {/* Floating glass orbs */}
      <div className="absolute -top-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-white/5 backdrop-blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full bg-[#F5A623]/10 backdrop-blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-48 h-48 rounded-full bg-white/[0.03] pointer-events-none" />
      <div className="absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:32px_32px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-0.5 bg-[#F5A623]" />
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623]">Limited Time</p>
        </div>
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-headline font-extrabold text-white leading-tight mb-4">
          Exclusive Offers &<br />
          <span className="text-[#F5A623]">Packages</span>
        </h1>
        <p className="text-white/60 max-w-xl text-sm md:text-base leading-relaxed mb-8">
          Premium skin, hair & laser treatments at unbeatable prices — trusted by {patientsCount} patients across {cityCount} cities. Book before they expire.
        </p>

        <div className="mb-10">
          <OfferHeroStats stats={stats} />
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="#offers" className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-6 py-3 rounded-2xl font-extrabold text-sm hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(245,166,35,0.35)] transition-all duration-200">
            <Tag size={15} /> Browse Offers
          </Link>
          <Link href="/book" className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white border border-white/20 px-6 py-3 rounded-2xl font-semibold text-sm hover:bg-white/20 transition">
            {consultationBadge} →
          </Link>
        </div>
      </div>
    </section>
  );
}
