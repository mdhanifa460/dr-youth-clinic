import Link from 'next/link';
import { Tag, Gift, Clock3, CreditCard, ShieldCheck, ArrowRight } from 'lucide-react';
import OfferHeroStats from './OfferHeroStats';
import OfferHighlightRail from './OfferHighlightRail';
import { discountPct } from '../OfferCard';

const TRUST_ITEMS = [
  { icon: Gift, label: 'Exclusive Clinic Offers' },
  { icon: Clock3, label: 'Limited Period Deals' },
  { icon: CreditCard, label: 'Easy EMI Options' },
  { icon: ShieldCheck, label: '100% Safe Treatments' },
];

export default function OfferHero({
  activeOfferCount,
  maxSave,
  cityCount,
  patientsCount,
  ratingValue,
  consultationBadge,
  featuredOffer,
  topOffers,
}: {
  activeOfferCount: number;
  maxSave: number;
  cityCount: number;
  patientsCount: string;
  ratingValue: string;
  consultationBadge: string;
  featuredOffer: any | null;
  topOffers: any[];
}) {
  const stats = [
    { icon: '🏷️', label: 'Active Offers', value: `${activeOfferCount}+` },
    { icon: '💰', label: 'Max Savings', value: maxSave > 0 ? `${maxSave}%` : 'Up to 50%' },
    { icon: '🏥', label: 'Clinics', value: `${cityCount} Cities` },
    { icon: '⭐', label: 'Patient Rating', value: `${ratingValue}/5` },
  ];
  const featuredPct = featuredOffer ? discountPct(featuredOffer.originalPrice, featuredOffer.discountedPrice) : 0;

  return (
    <section className="relative bg-[#0B2560] overflow-hidden">
      {/* Floating glass orbs */}
      <div className="absolute -top-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-white/5 backdrop-blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full bg-[#F5A623]/10 backdrop-blur-3xl pointer-events-none" />
      <div className="absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:32px_32px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-20 grid lg:grid-cols-2 gap-12 lg:gap-10 items-start">
        {/* ── LEFT: copy + stats + CTA ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-0.5 bg-[#F5A623]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623]">Limited Time</p>
          </div>
          <h1 className="text-3xl md:text-5xl font-headline font-extrabold text-white leading-tight mb-4">
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

        {/* ── RIGHT: featured spotlight + trust icons + limited-period rail ── */}
        <div className="space-y-6">
          {featuredOffer ? (
            <Link
              href={`/book?offer=${encodeURIComponent(featuredOffer.title)}`}
              className="block rounded-3xl bg-white/10 backdrop-blur-sm border border-white/15 p-6 hover:bg-white/[0.13] transition-colors duration-200"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5A623] mb-2">🔥 Limited Time Offer</p>
              {featuredPct > 0 && (
                <p className="text-white text-3xl font-extrabold mb-1">
                  Up to <span className="text-[#F5A623]">{featuredPct}%</span> OFF
                </p>
              )}
              <p className="text-white/70 text-sm mb-4">{featuredOffer.title}</p>
              <span className="inline-flex items-center gap-1.5 text-[#F5A623] text-sm font-bold">
                Explore Offer <ArrowRight size={14} />
              </span>
            </Link>
          ) : (
            <div className="rounded-3xl bg-white/10 backdrop-blur-sm border border-white/15 p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5A623] mb-2">Coming Soon</p>
              <p className="text-white text-lg font-extrabold mb-1">New Offers Being Prepared</p>
              <p className="text-white/60 text-sm">Book a {consultationBadge.toLowerCase()} to hear about them first.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-3">
                <Icon size={16} className="text-[#F5A623] shrink-0" />
                <span className="text-[11px] font-semibold text-white/80 leading-tight">{label}</span>
              </div>
            ))}
          </div>

          {topOffers.length > 0 && <OfferHighlightRail offers={topOffers} />}
        </div>
      </div>
    </section>
  );
}
