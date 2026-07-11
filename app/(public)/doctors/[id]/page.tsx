import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Award, ArrowLeft, GraduationCap, Languages, Stethoscope } from 'lucide-react';
import { connectDB } from '@/app/lib/mongodb';
import { Doctor } from '@/app/models/Doctor';
import { HomepageSection } from '@/app/models/HomepageSection';
import { getSiteConfig } from '@/app/lib/siteConfig';

export const revalidate = 300;

const LOCATION_LABELS: Record<string, string> = {
  chennai: 'Chennai', bangalore: 'Bangalore', coimbatore: 'Coimbatore', kochi: 'Kochi', all: 'All Clinics',
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

async function getDoctor(id: string) {
  try {
    await connectDB();
    const doc = await (Doctor as any).findById(id).lean();
    if (!doc || doc.active === false) return null;
    return JSON.parse(JSON.stringify(doc));
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const doctor = await getDoctor(params.id);
  if (!doctor) return { title: 'Doctor Not Found | DR Youth Clinic' };
  return {
    title: `${doctor.name} – ${doctor.title} | DR Youth Clinic`,
    description: doctor.bio
      ? doctor.bio.slice(0, 155) + (doctor.bio.length > 155 ? '…' : '')
      : `Meet ${doctor.name}, ${doctor.title} at DR Youth Clinic.`,
  };
}

export default async function DoctorDetailPage({ params }: { params: { id: string } }) {
  const [doctor, pc, siteConfig] = await Promise.all([getDoctor(params.id), getCachedPageContent(), getSiteConfig()]);
  if (!doctor) notFound();

  const locationLabel = doctor.locations?.includes('all')
    ? 'All Clinics'
    : doctor.locations?.map((l: string) => LOCATION_LABELS[l] || l).join(', ') || '';

  const firstName = doctor.name?.split(' ').find((w: string) => w.toLowerCase() !== 'dr') || doctor.name?.split(' ')[0] || '';

  // Admin-editable copy for this page, with the current hardcoded text as fallback defaults
  const freeWord = siteConfig.consultationFree ? 'free ' : '';
  const sidebarHeading  = pc.detailSidebarHeading || 'Book a Consultation';
  const sidebarBodyTpl  = pc.detailSidebarBody    || `Schedule a ${freeWord}initial consultation with {firstName} — zero commitment, just an honest expert assessment.`;
  const ctaHeadingTpl   = pc.detailCtaHeading      || 'Consult {firstName} Today';
  const ctaBody         = pc.detailCtaBody         || `Book a ${freeWord}initial consultation — get an expert opinion on your skin, hair or aesthetic concerns.`;

  const withFirstName = (tpl: string) => tpl.replace(/\{firstName\}/g, firstName);
  const sidebarBody = withFirstName(sidebarBodyTpl);
  const ctaHeading  = withFirstName(ctaHeadingTpl);

  return (
    <main className="bg-white">

      {/* ── HERO ── */}
      <section className="bg-[#0B2560] relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/[0.03] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 py-10 md:py-16">
          <Link href="/doctors" className="inline-flex items-center gap-1.5 text-white/50 hover:text-white text-xs font-semibold mb-8 transition">
            <ArrowLeft size={13} /> All Doctors
          </Link>

          <div className="flex flex-col sm:flex-row items-start gap-6 md:gap-8">
            {/* Photo */}
            <div className="relative w-28 sm:w-32 md:w-44 lg:w-48 aspect-[4/5] rounded-3xl overflow-hidden bg-white/10 shrink-0 ring-2 ring-white/10">
              {doctor.photo?.url ? (
                <Image
                  src={doctor.photo.url}
                  alt={doctor.name}
                  fill
                  sizes="(min-width: 1024px) 192px, (min-width: 768px) 176px, (min-width: 640px) 128px, 112px"
                  className="object-cover object-top"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-5xl opacity-60">👨‍⚕️</div>
              )}
            </div>

            {/* Name block */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-4xl font-headline font-extrabold text-white leading-tight">{doctor.name}</h1>
              <p className="text-[#F5A623] font-bold text-sm md:text-base mt-1">{doctor.title}</p>

              {/* Qualifications under designation */}
              {doctor.qualifications && (
                <p className="text-white/50 text-xs md:text-sm mt-1 font-medium">{doctor.qualifications}</p>
              )}

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {doctor.experience > 0 && (
                  <span className="flex items-center gap-1.5 text-xs bg-white/10 text-white px-3 py-1.5 rounded-full font-medium">
                    <Award size={11} className="text-[#F5A623]" /> {doctor.experience}+ yrs experience
                  </span>
                )}
                {locationLabel && (
                  <span className="flex items-center gap-1.5 text-xs bg-white/10 text-white px-3 py-1.5 rounded-full font-medium capitalize">
                    <MapPin size={11} className="text-[#F5A623]" /> {locationLabel}
                  </span>
                )}
                {doctor.languages?.length > 0 && (
                  <span className="flex items-center gap-1.5 text-xs bg-white/10 text-white px-3 py-1.5 rounded-full font-medium">
                    <Languages size={11} className="text-[#F5A623]" /> {doctor.languages.join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BODY ── */}
      <section className="max-w-5xl mx-auto px-6 py-12 md:py-16 grid md:grid-cols-3 gap-10 md:gap-12">

        {/* LEFT — main content */}
        <div className="md:col-span-2 space-y-10">

          {/* About / Bio */}
          {doctor.bio && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-5 h-5 rounded-full bg-[#f0f5ff] flex items-center justify-center shrink-0">
                  <Stethoscope size={11} className="text-[#0B2560]" />
                </span>
                <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">About</h2>
              </div>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed whitespace-pre-line">{doctor.bio}</p>
            </div>
          )}

          {/* Qualifications */}
          {doctor.qualifications && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-5 h-5 rounded-full bg-[#f0f5ff] flex items-center justify-center shrink-0">
                  <GraduationCap size={11} className="text-[#0B2560]" />
                </span>
                <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Qualifications</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {doctor.qualifications.split(',').map((q: string, i: number) => (
                  <span key={i} className="text-sm bg-[#f6faff] border border-blue-50 text-[#0B2560] px-3 py-1.5 rounded-full font-medium">
                    {q.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Specializations */}
          {doctor.specializations?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-5 h-5 rounded-full bg-[#f0f5ff] flex items-center justify-center shrink-0">
                  <Award size={11} className="text-[#0B2560]" />
                </span>
                <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Specializations</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {doctor.specializations.map((s: string, i: number) => (
                  <span key={i} className="text-sm bg-[#0B2560] text-white px-3 py-1.5 rounded-full font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {doctor.languages?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-5 h-5 rounded-full bg-[#f0f5ff] flex items-center justify-center shrink-0">
                  <Languages size={11} className="text-[#0B2560]" />
                </span>
                <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Languages</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {doctor.languages.map((l: string, i: number) => (
                  <span key={i} className="text-sm bg-gray-50 border border-gray-100 text-gray-600 px-3 py-1.5 rounded-full font-medium">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — sticky CTA */}
        <div className="space-y-4">
          <div className="bg-[#f6faff] border border-blue-50 rounded-3xl p-6 space-y-4 md:sticky md:top-6">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{sidebarHeading}</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              {sidebarBody}
            </p>
            <Link href="/book"
              className="flex items-center justify-center gap-2 bg-[#0B2560] text-white py-3 rounded-2xl font-bold text-sm hover:bg-[#0d2d73] hover:-translate-y-0.5 transition-all shadow-md shadow-[#0B2560]/20">
              <Calendar size={14} /> {siteConfig.consultationCta}
            </Link>
            <p className="text-[10px] text-gray-400 text-center">No fees · No obligation</p>
          </div>

          {/* Quick stats card */}
          {(doctor.experience > 0 || locationLabel) && (
            <div className="rounded-3xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              {doctor.experience > 0 && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <Award size={14} className="text-[#F5A623] shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Experience</p>
                    <p className="text-sm font-bold text-[#0B2560]">{doctor.experience}+ Years</p>
                  </div>
                </div>
              )}
              {locationLabel && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <MapPin size={14} className="text-[#F5A623] shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Available At</p>
                    <p className="text-sm font-bold text-[#0B2560] capitalize">{locationLabel}</p>
                  </div>
                </div>
              )}
              {doctor.languages?.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <Languages size={14} className="text-[#F5A623] shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Languages</p>
                    <p className="text-sm font-bold text-[#0B2560]">{doctor.languages.join(' · ')}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="bg-[#0B2560] py-14">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#F5A623] mb-3">Ready to Begin?</p>
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-white mb-3">
            {ctaHeading}
          </h2>
          <p className="text-white/60 text-sm mb-8 max-w-md mx-auto">
            {ctaBody}
          </p>
          <Link href="/book"
            className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-8 py-3.5 rounded-2xl font-extrabold text-sm hover:-translate-y-0.5 transition shadow-lg">
            <Calendar size={15} /> {siteConfig.consultationCta}
          </Link>
        </div>
      </section>

    </main>
  );
}
