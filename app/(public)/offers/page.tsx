import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { Calendar, Tag, CheckCircle } from 'lucide-react';
import { connectDB } from '@/app/lib/mongodb';
import { Offer } from '@/app/models/Offer';
import OffersClient from './OffersClient';
import { discountPct } from './OfferCard';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Exclusive Offers & Packages | DR Youth Clinic',
  description: 'Limited-time deals on skin care, hair restoration and laser treatments at DR Youth Clinic. Save up to 50% on premium aesthetic packages across Chennai, Bangalore, Kochi and Coimbatore.',
};

const getOffers = unstable_cache(
  async () => {
    try {
      await connectDB();
      const offers = await (Offer as any)
        .find({ active: true })
        .sort({ order: 1, createdAt: -1 })
        .lean();
      return JSON.parse(JSON.stringify(offers));
    } catch { return []; }
  },
  ['public-offers'],
  { revalidate: 60, tags: ['offers'] }
);

// ── Page ────────────────────────────────────────────────────────────────────
export default async function OffersPage() {
  const offers = await getOffers();
  const activeOffers = offers.filter((o: any) => !o.validUntil || new Date(o.validUntil) >= new Date());
  const maxSave = offers.reduce((max: number, o: any) => {
    const pct = discountPct(o.originalPrice, o.discountedPrice);
    return pct > max ? pct : max;
  }, 0);

  const TERMS = [
    'All offers are valid for a limited period and subject to availability.',
    'Packages cannot be combined with other ongoing discounts or promotions.',
    'Bookings must be made in advance to avail the offer price.',
    'Offers are non-transferable and valid for one patient per transaction.',
    'DR Youth Clinic reserves the right to modify or withdraw any offer without prior notice.',
    'All treatments are subject to doctor consultation and suitability assessment.',
  ];

  return (
    <main>
      {/* ── HERO ── */}
      <section className="relative bg-[#0B2560] overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full bg-[#F5A623]/10 pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-48 h-48 rounded-full bg-white/[0.03] pointer-events-none" />

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
            Premium skin, hair & laser treatments at unbeatable prices — trusted by 25,000+ patients across 4 cities. Book before they expire.
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap gap-8 mb-10">
            {[
              { icon: '🏷️', label: 'Active Offers', value: `${activeOffers.length}+` },
              { icon: '💰', label: 'Max Savings', value: maxSave > 0 ? `${maxSave}%` : 'Up to 50%' },
              { icon: '🏥', label: 'Clinics', value: '4 Cities' },
              { icon: '⭐', label: 'Patient Rating', value: '4.9/5' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <p className="text-xl font-extrabold text-white leading-none">{s.value}</p>
                  <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="#offers" className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-6 py-3 rounded-2xl font-extrabold text-sm hover:-translate-y-0.5 transition shadow-lg">
              <Tag size={15} /> Browse Offers
            </Link>
            <Link href="/book" className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 px-6 py-3 rounded-2xl font-semibold text-sm hover:bg-white/20 transition">
              Free Consultation →
            </Link>
          </div>
        </div>
      </section>

      <section id="offers" className="bg-[#f6faff] py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          {offers.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-6xl mb-4">🏷️</p>
              <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-2">New Offers Coming Soon</h2>
              <p className="text-gray-500 mb-6">We're putting together exclusive packages for you. Check back shortly or book a free consultation.</p>
              <Link href="/book"
                className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-6 py-3 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition">
                <Calendar size={15} /> Book Free Consultation
              </Link>
            </div>
          ) : (
            <OffersClient offers={offers} />
          )}
        </div>
      </section>

      {/* ── TERMS ── */}
      {offers.length > 0 && (
        <section className="bg-white py-12">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-lg font-headline font-bold text-[#0B2560] mb-4 flex items-center gap-2">
              <CheckCircle size={18} className="text-[#3B82C4]" /> Terms & Conditions
            </h2>
            <ul className="space-y-2">
              {TERMS.map((t, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-500">
                  <span className="text-[#3B82C4] font-bold mt-0.5 shrink-0">{i + 1}.</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── BOTTOM CTA ── */}
      <section className="bg-[#0B2560] py-14">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-3">Tailored for You</p>
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-white mb-3">
            Can't Find the Right Package?
          </h2>
          <p className="text-white/60 text-sm mb-8 max-w-md mx-auto">
            Talk to our specialists for a personalised treatment plan and custom pricing — no commitment required.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/book"
              className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-8 py-3.5 rounded-2xl font-extrabold text-sm hover:-translate-y-0.5 transition shadow-lg">
              <Calendar size={15} /> Book Free Consultation
            </Link>
            <Link href="/doctors"
              className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 px-6 py-3.5 rounded-2xl font-semibold text-sm hover:bg-white/20 transition">
              Meet Our Doctors
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
