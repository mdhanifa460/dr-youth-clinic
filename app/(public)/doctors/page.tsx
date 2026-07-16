import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { Calendar, Users, MapPin, Award } from 'lucide-react';
import { connectDB } from '@/app/lib/mongodb';
import { Doctor } from '@/app/models/Doctor';
import { HomepageSection } from '@/app/models/HomepageSection';
import DoctorsGrid from './DoctorsGrid';
import { getSiteConfig } from '@/app/lib/siteConfig';

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
export const metadata: Metadata = {
  title: 'Our Expert Doctors | DR Youth Clinic',
  description: 'Meet the specialist team at DR Youth Clinic — expert dermatologists, trichologists and aesthetic physicians across Chennai, Bangalore, Coimbatore and Kochi.',
  alternates: { canonical: `${SITE_URL}/doctors` },
};

const getCachedPageContent = unstable_cache(
  async () => {
    try {
      await connectDB();
      const s = await HomepageSection.findOne({ sectionKey: 'doctors_page' } as any).lean() as any;
      return (s?.data as Record<string, string>) || {};
    } catch { return {}; }
  },
  ['doctors-page-content'],
  { revalidate: 300, tags: ['doctors-page'] }
);

async function getAllDoctors() {
  try {
    await connectDB();
    const docs = await Doctor.find({ active: true } as any)
      .sort({ order: 1, createdAt: -1 })
      .lean();
    return JSON.parse(JSON.stringify(docs));
  } catch {
    return [];
  }
}

export default async function DoctorsPage() {
  const [doctors, pc, siteConfig] = await Promise.all([getAllDoctors(), getCachedPageContent(), getSiteConfig()]);

  const avgExp = doctors.length
    ? Math.round(doctors.reduce((s: number, d: any) => s + (d.experience || 0), 0) / doctors.length)
    : 0;

  const locationCount = Array.from(new Set(
    doctors.flatMap((d: any) =>
      d.locations?.includes('all') ? [] as string[] : (d.locations || []) as string[]
    )
  )).length;

  const STATS = [
    { icon: Users, label: 'Specialists', value: `${doctors.length}+` },
    { icon: MapPin, label: 'Clinics', value: `${locationCount || 4}` },
    { icon: Award, label: 'Avg. Experience', value: `${avgExp || 8}+ yrs` },
  ];

  const heroHeading   = pc.heroHeading   || 'Meet Our Expert Specialist Team';
  const heroSubheading = pc.heroSubheading || 'Board-certified dermatologists, trichologists and aesthetic physicians committed to delivering safe, natural and lasting results.';
  const gridHeading   = pc.gridHeading   || 'Trusted by 25,000+ Patients';
  const gridSubheading = pc.gridSubheading || 'Filter by clinic location below';
  const ctaHeading    = pc.ctaHeading    || 'Consult a Specialist Today';
  const ctaBody       = pc.ctaBody       || `Book a ${siteConfig.consultationFree ? 'free ' : ''}initial consultation — zero commitment, just an honest assessment of your concerns.`;

  // Split heading at last space for gold highlight on last word
  const headingWords = heroHeading.trim().split(' ');
  const headingMain  = headingWords.slice(0, -1).join(' ');
  const headingGold  = headingWords.at(-1) || '';

  return (
    <main>
      {/* ── HERO ── */}
      <section className="relative bg-[#0B2560] overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-white/[0.03] pointer-events-none" />

        {/* py-10/mt-6 on mobile (vs md:py-24/md:mt-10) trims enough vertical
            rhythm that the CTA button below lands above the fixed mobile
            WhatsApp/Call/Book bar instead of behind it — margin-bottom on
            the CTA itself can't fix this (it only pushes what comes AFTER
            it, not the button's own position), so the fix has to come from
            the space above. */}
        <div className="relative max-w-7xl mx-auto px-6 py-10 md:py-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-3">
            DR Youth Clinic
          </p>
          <h1 className="text-3xl md:text-5xl font-headline font-extrabold text-white leading-tight max-w-2xl">
            {headingMain}<br />
            <span className="text-[#F5A623]">{headingGold}</span>
          </h1>
          <p className="text-white/60 mt-4 max-w-lg text-sm md:text-base leading-relaxed">
            {heroSubheading}
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap gap-8 mt-6 md:mt-10">
            {STATS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-[#F5A623]" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-white leading-none">{value}</p>
                  <p className="text-xs text-white/50 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-6 md:mt-8">
            <Link
              href="/book"
              className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-6 py-3 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition shadow-lg shadow-[#0B2560]/30"
            >
              <Calendar size={15} /> {siteConfig.consultationCta}
            </Link>
          </div>
        </div>
      </section>

      {/* ── DOCTORS GRID ── */}
      <section className="bg-[#f6faff] py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3B82C4] mb-2">Our Specialists</p>
              <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-[#0B2560]">
                {gridHeading}
              </h2>
              <p className="text-gray-500 text-sm mt-1">{gridSubheading}</p>
            </div>
          </div>

          {doctors.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-3">🩺</p>
              <p className="text-gray-500 font-semibold">Our team profiles are coming soon.</p>
            </div>
          ) : (
            <DoctorsGrid doctors={doctors} />
          )}
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="bg-[#0B2560] py-14">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-3">Ready to Begin?</p>
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-white mb-3">
            {ctaHeading}
          </h2>
          <p className="text-white/60 text-sm mb-8 max-w-md mx-auto">
            {ctaBody}
          </p>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-8 py-3.5 rounded-2xl font-extrabold text-sm hover:-translate-y-0.5 transition shadow-lg"
          >
            <Calendar size={15} /> {siteConfig.consultationCta}
          </Link>
        </div>
      </section>
    </main>
  );
}
