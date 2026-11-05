import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { Calendar, Users, MapPin, Award } from 'lucide-react';
import { connectDB } from '@/app/lib/mongodb';
import { Doctor } from '@/app/models/Doctor';
import { HomepageSection } from '@/app/models/HomepageSection';
import DoctorsGrid from './DoctorsGrid';
import { getSiteConfig } from '@/app/lib/siteConfig';
import { hasUnsupportedClaim, mentionsPatientCount, scrubDoctorBios } from '@/app/lib/patientClaims';

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
export const metadata: Metadata = {
  title: 'Our Expert Doctors',
  description: 'Meet the doctors at DR Youth Clinic, with their qualifications and clinics across Chennai, Bangalore, Coimbatore and Kochi.',
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
    return scrubDoctorBios(JSON.parse(JSON.stringify(docs)));
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
    { icon: Users, label: 'Doctors', value: `${doctors.length}` },
    { icon: MapPin, label: 'Clinics', value: '4' },
  ];

  const heroHeading   = pc.heroHeading   || 'Meet Our Doctors';
  const heroSubheading = (!hasUnsupportedClaim(pc.heroSubheading) && !/dermatolog|board[-\s]certified/i.test(pc.heroSubheading || '') && pc.heroSubheading) || 'Meet our doctors, with their qualifications, experience and the clinics where they practise.';
  const gridHeading   = (!mentionsPatientCount(pc.gridHeading) && pc.gridHeading) || 'Our Doctors';
  const gridSubheading = pc.gridSubheading || 'Filter by clinic location below';
  const ctaHeading    = pc.ctaHeading    || 'Consult a Doctor';
  const ctaBody       = pc.ctaBody       || `Book a ${siteConfig.consultationFree ? 'free ' : ''}initial consultation — zero commitment, just an honest assessment of your concerns.`;

  // Split heading at last space for gold highlight on last word
  const headingWords = heroHeading.trim().split(' ');
  const headingMain  = headingWords.slice(0, -1).join(' ');
  const headingGold  = headingWords.at(-1) || '';

  return (
    <div>
      {/* ── HERO ── */}
      <section className="relative bg-primary overflow-hidden">
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
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-champagne mb-3">
            DR Youth Clinic
          </p>
          <h1 className="text-3xl md:text-5xl font-headline font-extrabold text-white leading-tight max-w-2xl">
            {headingMain}{' '}<br />
            <span className="text-champagne">{headingGold}</span>
          </h1>
          <p className="text-white/80 mt-4 max-w-lg text-sm md:text-base leading-relaxed">
            {heroSubheading}
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap gap-8 mt-6 md:mt-10">
            {STATS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-champagne" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-white leading-none">{value}</p>
                  <p className="text-xs text-white/75 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-6 md:mt-8">
            <Link
              href="/book"
              className="inline-flex items-center gap-2 bg-champagne text-primary px-6 py-3 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition shadow-lg shadow-primary/30"
            >
              <Calendar size={15} /> {siteConfig.consultationCta}
            </Link>
          </div>
        </div>
      </section>

      {/* ── DOCTORS GRID ── */}
      <section className="bg-canvas py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary mb-2">Our Team</p>
              <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-primary">
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
      <section className="bg-primary py-14">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-champagne mb-3">Ready to Begin?</p>
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-white mb-3">
            {ctaHeading}
          </h2>
          <p className="text-white/80 text-sm mb-8 max-w-md mx-auto">
            {ctaBody}
          </p>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 bg-champagne text-primary px-8 py-3.5 rounded-2xl font-extrabold text-sm hover:-translate-y-0.5 transition shadow-lg"
          >
            <Calendar size={15} /> {siteConfig.consultationCta}
          </Link>
        </div>
      </section>
    </div>
  );
}
