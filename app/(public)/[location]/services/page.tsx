import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Sparkles } from 'lucide-react';
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { LocationContent } from '@/app/models/LocationContent';
import { locations } from '@/app/data/locations';
import { getSiteConfig } from '@/app/lib/siteConfig';

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

const CATEGORIES = [
  {
    key: 'Skin',
    slug: 'skin',
    label: 'Skin & Aesthetics',
    tagline: 'Radiance · Restored',
    description: 'Advanced dermatological solutions for luminous, healthy skin — from acne to anti-ageing.',
    icon: '✨',
    bg: 'bg-gradient-to-br from-[#fff5f0] to-[#fde8e0]',
    border: 'border-[#f9c3ae]',
    pill: 'bg-[#f9c3ae]/60 text-[#8b3018]',
    heading: 'text-[#7c1d0a]',
    sub: 'text-[#a63c1c]',
    dot: 'bg-[#c96a4e]',
    arrow: 'text-[#a63c1c]',
    glyph: 'opacity-[0.07] select-none pointer-events-none absolute -bottom-4 -right-4 text-[140px] leading-none',
  },
  {
    key: 'Hair',
    slug: 'hair',
    label: 'Hair Restoration',
    tagline: 'Volume · Confidence',
    description: 'Expert trichology for PRP, GFC, transplants, and scalp-level treatments.',
    icon: '🌿',
    bg: 'bg-gradient-to-br from-[#fffbeb] to-[#fef0c7]',
    border: 'border-[#fcd34d]',
    pill: 'bg-[#fcd34d]/50 text-[#78350f]',
    heading: 'text-[#6b2d00]',
    sub: 'text-[#9a4109]',
    dot: 'bg-[#d97706]',
    arrow: 'text-[#9a4109]',
    glyph: 'opacity-[0.07] select-none pointer-events-none absolute -bottom-4 -right-4 text-[140px] leading-none',
  },
  {
    key: 'Laser',
    slug: 'laser',
    label: 'Laser Precision',
    tagline: 'Science · Skin',
    description: 'Cutting-edge laser technology for hair removal, pigmentation, and skin rejuvenation.',
    icon: '⚡',
    bg: 'bg-gradient-to-br from-[#eff6ff] to-[#dbeafe]',
    border: 'border-[#93c5fd]',
    pill: 'bg-[#93c5fd]/50 text-[#1e3a8a]',
    heading: 'text-[#0B2560]',
    sub: 'text-[#1e40af]',
    dot: 'bg-[#3b82f6]',
    arrow: 'text-[#1e40af]',
    glyph: 'opacity-[0.07] select-none pointer-events-none absolute -bottom-4 -right-4 text-[140px] leading-none',
  },
  {
    key: 'Other',
    slug: 'other',
    label: 'Specialist Care',
    tagline: 'Tailored · Precise',
    description: 'Specialised aesthetic and medical wellness procedures crafted for your unique goals.',
    icon: '🏥',
    bg: 'bg-gradient-to-br from-[#ecfdf5] to-[#d1fae5]',
    border: 'border-[#6ee7b7]',
    pill: 'bg-[#6ee7b7]/50 text-[#064e3b]',
    heading: 'text-[#052e16]',
    sub: 'text-[#047857]',
    dot: 'bg-[#10b981]',
    arrow: 'text-[#047857]',
    glyph: 'opacity-[0.07] select-none pointer-events-none absolute -bottom-4 -right-4 text-[140px] leading-none',
  },
];

interface PageProps {
  params: { location: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const loc = locations[params.location];
  if (!loc) return {};
  const city = loc.name;
  return {
    title: `All Treatments in ${city} | DR Youth Clinic`,
    description: `Explore skin, hair, and laser treatments at DR Youth Clinic ${city}. Expert dermatologists, proven results, transparent pricing.`,
    alternates: { canonical: `${SITE_URL}/${params.location}/services` },
    openGraph: {
      title: `Clinical Treatments in ${city} | DR Youth Clinic`,
      description: `Browse our full range of dermatology, hair restoration, and laser procedures in ${city}.`,
      url: `${SITE_URL}/${params.location}/services`,
    },
  };
}

async function getClinicPhone(location: string, fallback: string) {
  try {
    await connectDB();
    const doc = await LocationContent.findOne({ location: location.toLowerCase() }).lean() as any;
    return doc?.clinicInfo?.phone || fallback;
  } catch {
    return fallback;
  }
}

async function getCategoryData(location: string) {
  try {
    await connectDB();
    const raw = await Service.find(
      { location: { $in: [location.toLowerCase(), 'all'] }, status: 'active' } as any
    )
      .select('category name')
      .lean() as any[];

    const counts: Record<string, number> = {};
    const previews: Record<string, string[]> = {};
    for (const s of raw) {
      counts[s.category] = (counts[s.category] || 0) + 1;
      if (!previews[s.category]) previews[s.category] = [];
      if (previews[s.category].length < 3) previews[s.category].push(s.name);
    }
    return { counts, previews, total: raw.length };
  } catch {
    return { counts: {}, previews: {}, total: 0 };
  }
}

export default async function ServicesHubPage({ params }: PageProps) {
  const loc = locations[params.location];
  if (!loc) notFound();

  const [{ counts, previews, total }, phone, siteConfig] = await Promise.all([
    getCategoryData(params.location),
    getClinicPhone(params.location, loc.phone),
    getSiteConfig(),
  ]);

  return (
    <main className="bg-white min-h-screen">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0B2560] via-[#0d3175] to-[#163a8a] text-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-white/[0.03] translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-white/[0.04] -translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-1/2 right-[15%] w-2 h-2 rounded-full bg-[#F5A623]/40" />
          <div className="absolute top-1/3 right-[30%] w-1 h-1 rounded-full bg-white/30" />
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-10 py-24 md:py-32 relative">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/50 mb-7">
              <span className="w-7 h-px bg-white/30" />
              {loc.name} · All Treatments
            </span>
            <h1 className="text-5xl md:text-[64px] font-headline font-extrabold leading-[1.05] mb-6 tracking-tight">
              Clinical<br />
              <span className="text-[#F5A623]">Excellence.</span>
            </h1>
            <p className="text-[17px] text-white/65 max-w-lg leading-relaxed mb-10">
              {total > 0 ? `${total} specialised procedures` : 'Premium procedures'} across
              dermatology, hair restoration, and precision laser — all in {loc.name}.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/book"
                className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-7 py-3.5 rounded-xl font-bold shadow-lg hover:-translate-y-0.5 transition-all text-sm"
              >
                {siteConfig.consultationCta}
                <ArrowRight size={15} />
              </Link>
              <a
                href="#treatments"
                className="inline-flex items-center gap-2 border border-white/25 text-white/90 px-7 py-3.5 rounded-xl font-semibold text-sm hover:bg-white/10 transition"
              >
                Explore Categories
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div className="bg-[#f6faff] border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex flex-wrap gap-8 items-center justify-between">
          <div className="flex flex-wrap gap-8 md:gap-12">
            {[
              { label: 'Treatments', value: total > 0 ? `${total}+` : '20+' },
              { label: 'Categories', value: '4' },
              { label: 'Years Expertise', value: '10+' },
              { label: 'Happy Patients', value: '5,000+' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-extrabold text-[#0B2560] leading-none">{s.value}</div>
                <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          <Link
            href="/book"
            className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B2560] hover:text-[#3B82C4] transition"
          >
            Free first consultation <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── CATEGORY CARDS ── */}
      <section id="treatments" className="max-w-7xl mx-auto px-6 md:px-10 py-20">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-[#0B2560] mb-4 tracking-tight">
            Choose Your Treatment
          </h2>
          <p className="text-gray-400 text-lg max-w-lg mx-auto">
            Select a category to explore all available procedures, pricing, and what to expect.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
          {CATEGORIES.map((cat) => {
            const count = counts[cat.key] || 0;
            const names = previews[cat.key] || [];

            return (
              <Link
                key={cat.key}
                href={`/${params.location}/services/${cat.slug}`}
                className={`group relative overflow-hidden rounded-3xl border ${cat.border} ${cat.bg} p-8 md:p-10 block transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5`}
              >
                {/* big decorative glyph */}
                <span className={cat.glyph}>{cat.icon}</span>

                <div className="relative space-y-5">
                  {/* top row */}
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-4xl md:text-5xl leading-none">{cat.icon}</span>
                    <span className={`shrink-0 mt-1 text-[11px] font-bold px-3 py-1 rounded-full ${cat.pill}`}>
                      {count > 0 ? `${count} treatment${count !== 1 ? 's' : ''}` : 'Coming soon'}
                    </span>
                  </div>

                  {/* heading */}
                  <div>
                    <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${cat.sub} mb-1.5`}>
                      {cat.tagline}
                    </p>
                    <h3 className={`text-2xl md:text-3xl font-headline font-extrabold ${cat.heading} leading-tight`}>
                      {cat.label}
                    </h3>
                    <p className="text-sm text-gray-500 mt-2 leading-relaxed">{cat.description}</p>
                  </div>

                  {/* service name previews */}
                  {names.length > 0 && (
                    <ul className="space-y-1.5">
                      {names.map((name) => (
                        <li key={name} className="flex items-center gap-2.5 text-sm text-gray-500">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cat.dot}`} />
                          {name}
                        </li>
                      ))}
                      {count > 3 && (
                        <li className="text-xs text-gray-400 pl-4">+{count - 3} more treatments</li>
                      )}
                    </ul>
                  )}

                  {/* CTA arrow */}
                  <div className={`flex items-center gap-2 text-sm font-bold ${cat.arrow} pt-1 group-hover:gap-3 transition-all duration-200`}>
                    Explore Treatments
                    <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="bg-[#0B2560] py-20 text-white">
        <div className="max-w-3xl mx-auto text-center px-6 space-y-5">
          <Sparkles className="mx-auto mb-2 opacity-40" size={30} />
          <h2 className="text-4xl font-headline font-extrabold tracking-tight">
            Not sure where to start?
          </h2>
          <p className="text-white/60 text-lg max-w-lg mx-auto leading-relaxed">
            Book a {siteConfig.consultationFree ? 'free ' : ''}consultation. Our specialists in {loc.name} will assess your needs and
            recommend the right treatment — no pressure.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              href="/book"
              className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-8 py-4 rounded-xl font-bold shadow-lg hover:-translate-y-0.5 transition"
            >
              {siteConfig.consultationCta}
              <ArrowRight size={16} />
            </Link>
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-2 border border-white/25 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition"
            >
              Call {phone}
            </a>
          </div>
        </div>
      </section>

    </main>
  );
}
