import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { connectDB } from '@/app/lib/mongodb';
import { Offer } from '@/app/models/Offer';
import { Doctor } from '@/app/models/Doctor';
import { getSiteConfig } from '@/app/lib/siteConfig';
import { locations } from '@/app/data/locations';
import OffersClient from './OffersClient';
import { discountPct } from './OfferCard';
import OfferHero from './components/OfferHero';
import OfferHighlightRail from './components/OfferHighlightRail';
import OfferFAQSection from './components/OfferFAQSection';
import OfferComingSoonSection from './components/OfferComingSoonSection';
import OfferDoctorNote from './components/OfferDoctorNote';
import OfferTestimonials from './components/OfferTestimonials';

export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
export const metadata: Metadata = {
  title: 'Exclusive Offers & Packages',
  description: 'Limited-time deals on skin care, hair restoration and laser treatments at DR Youth Clinic. Save up to 50% on premium aesthetic packages across Chennai, Bangalore, Kochi and Coimbatore.',
  alternates: { canonical: `${SITE_URL}/offers` },
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

const getFeaturedDoctors = unstable_cache(
  async () => {
    try {
      await connectDB();
      const docs = await (Doctor as any).find({ active: true }).sort({ order: 1, createdAt: -1 }).limit(4).lean();
      return JSON.parse(JSON.stringify(docs));
    } catch { return []; }
  },
  ['offers-page-doctors'],
  { revalidate: 300, tags: ['doctors'] }
);

// ── Page ────────────────────────────────────────────────────────────────────
export default async function OffersPage() {
  const [offers, siteConfig, doctors] = await Promise.all([getOffers(), getSiteConfig(), getFeaturedDoctors()]);
  const activeOffers = offers.filter((o: any) => !o.validUntil || new Date(o.validUntil) >= new Date());
  const maxSave = activeOffers.reduce((max: number, o: any) => {
    const pct = discountPct(o.originalPrice, o.discountedPrice);
    return pct > max ? pct : max;
  }, 0);
  const cityCount = Object.keys(locations).length;

  const topOffers = [...activeOffers]
    .sort((a: any, b: any) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return discountPct(b.originalPrice, b.discountedPrice) - discountPct(a.originalPrice, a.discountedPrice);
    })
    .slice(0, 4);

  // Same real-contact-channel fallback chain MobileStickyBar already uses.
  const waMessage = encodeURIComponent('Hi, I would like to know more about membership, combo, loyalty, referral or festival offers at DR Youth Clinic.');
  const contactUrl = siteConfig.publicWhatsApp
    ? `https://wa.me/${siteConfig.publicWhatsApp.replace(/\D/g, '')}?text=${waMessage}`
    : siteConfig.publicPhone
      ? `tel:${siteConfig.publicPhone.replace(/\s+/g, '')}`
      : '/book';

  return (
    <main>
      <OfferHero
        activeOfferCount={activeOffers.length}
        maxSave={maxSave}
        cityCount={cityCount}
        patientsCount={siteConfig.patientsCount}
        ratingValue={siteConfig.ratingValue}
        consultationBadge={siteConfig.consultationBadge}
      />

      <section id="offers" className="bg-[#f6faff] py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          {activeOffers.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-6xl mb-4">🏷️</p>
              <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-2">New Offers Coming Soon</h2>
              <p className="text-gray-500 mb-6">We're putting together exclusive packages for you. Check back shortly or book a {siteConfig.consultationFree ? 'free ' : ''}consultation.</p>
              <Link href="/book"
                className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-6 py-3 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition">
                <Calendar size={15} /> {siteConfig.consultationCta}
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_320px] gap-10">
              <OffersClient offers={activeOffers} />
              <OfferHighlightRail offers={topOffers} />
            </div>
          )}
        </div>
      </section>

      {activeOffers.length > 0 && <OfferDoctorNote doctors={doctors} />}
      <OfferTestimonials />
      <OfferComingSoonSection contactUrl={contactUrl} />
      {activeOffers.length > 0 && <OfferFAQSection />}

      {/* ── BOTTOM CTA ── */}
      <section className="relative bg-[#0B2560] py-14 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#F5A623]/10 backdrop-blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-3">Tailored for You</p>
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-white mb-3">
            Can't Find the Right Package?
          </h2>
          <p className="text-white/60 text-sm mb-8 max-w-md mx-auto">
            Talk to our specialists for a personalised treatment plan and custom pricing — no commitment required.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/book"
              className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-8 py-3.5 rounded-2xl font-extrabold text-sm hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(245,166,35,0.35)] transition-all duration-200">
              <Calendar size={15} /> {siteConfig.consultationCta}
            </Link>
            <Link href="/doctors"
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white border border-white/20 px-6 py-3.5 rounded-2xl font-semibold text-sm hover:bg-white/20 transition">
              Meet Our Doctors
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
