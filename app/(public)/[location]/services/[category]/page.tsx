import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle, Clock, IndianRupee, Zap } from 'lucide-react';
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { locations } from '@/app/data/locations';
import { getSiteConfig } from '@/app/lib/siteConfig';

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

// Canonical category definitions — slug (URL) → DB key
const CATEGORY_MAP: Record<string, string> = {
  skin: 'Skin',
  hair: 'Hair',
  laser: 'Laser',
  other: 'Other',
};

const CATEGORY_META: Record<string, {
  label: string;
  tagline: string;
  description: string;
  icon: string;
  heroGrad: string;
  accentText: string;
  pillBg: string;
  pillText: string;
  badgeBg: string;
  badgeText: string;
}> = {
  skin: {
    label: 'Skin & Aesthetics',
    tagline: 'Radiance · Restored',
    description:
      'Evidence-based dermatological treatments for every skin concern — from acne management and pigmentation correction to anti-ageing and deep hydration. Our specialists tailor every protocol to your unique skin biology.',
    icon: '✨',
    heroGrad: 'from-[#7c1d0a] via-[#a63c1c] to-[#c96a4e]',
    accentText: 'text-[#f9c3ae]',
    pillBg: 'bg-[#f9c3ae]/20',
    pillText: 'text-[#f9c3ae]',
    badgeBg: 'bg-[#7c1d0a]',
    badgeText: 'text-[#f9c3ae]',
  },
  hair: {
    label: 'Hair Restoration',
    tagline: 'Volume · Confidence',
    description:
      'Comprehensive hair and scalp solutions — PRP therapy, GFC, transplants, and medical-grade treatments for hair loss, thinning, and alopecia. Clinically proven protocols with lasting results.',
    icon: '🌿',
    heroGrad: 'from-[#6b2d00] via-[#9a4109] to-[#d97706]',
    accentText: 'text-[#fcd34d]',
    pillBg: 'bg-[#fcd34d]/20',
    pillText: 'text-[#fcd34d]',
    badgeBg: 'bg-[#78350f]',
    badgeText: 'text-[#fcd34d]',
  },
  laser: {
    label: 'Laser Precision',
    tagline: 'Science · Skin',
    description:
      'FDA-approved laser technology for permanent hair reduction, pigmentation, acne scarring, and full skin rejuvenation. Precision targeting with minimal downtime and maximum results.',
    icon: '⚡',
    heroGrad: 'from-[#0B2560] via-[#1e3a8a] to-[#3b82f6]',
    accentText: 'text-[#93c5fd]',
    pillBg: 'bg-[#93c5fd]/20',
    pillText: 'text-[#93c5fd]',
    badgeBg: 'bg-[#1e3a8a]',
    badgeText: 'text-[#93c5fd]',
  },
  other: {
    label: 'Specialist Care',
    tagline: 'Tailored · Precise',
    description:
      'Specialised aesthetic and medical wellness procedures designed for unique concerns. Our experts craft a personalised plan for every patient with attention to safety, outcomes, and comfort.',
    icon: '🏥',
    heroGrad: 'from-[#052e16] via-[#064e3b] to-[#059669]',
    accentText: 'text-[#6ee7b7]',
    pillBg: 'bg-[#6ee7b7]/20',
    pillText: 'text-[#6ee7b7]',
    badgeBg: 'bg-[#064e3b]',
    badgeText: 'text-[#6ee7b7]',
  },
};

interface PageProps {
  params: { location: string; category: string };
}

async function getServicesForCategory(location: string, category: string) {
  try {
    await connectDB();
    return Service.find({
      location: { $in: [location.toLowerCase(), 'all'] },
      category,
      status: 'active',
    } as any)
      .sort({ createdAt: -1 })
      .lean() as Promise<any[]>;
  } catch {
    return [];
  }
}

// Used to detect old-style service slugs that ended up at this route
async function findServiceBySlug(location: string, slug: string) {
  try {
    await connectDB();
    return Service.findOne({
      urlSlug: slug,
      location: { $in: [location.toLowerCase(), 'all'] },
      status: 'active',
    } as any)
      .select('category urlSlug')
      .lean() as Promise<any | null>;
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  return Object.keys(CATEGORY_MAP).map((slug) => ({ category: slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const loc = locations[params.location];
  if (!loc) return {};
  const catSlug = params.category.toLowerCase();
  const meta = CATEGORY_META[catSlug];
  if (!meta) return {};
  const city = loc.name;
  return {
    title: `${meta.label} in ${city} | DR Youth Clinic`,
    description: `Explore ${meta.label.toLowerCase()} treatments at DR Youth Clinic ${city}. ${meta.description.slice(0, 100)}...`,
    alternates: { canonical: `${SITE_URL}/${params.location}/services/${catSlug}` },
    openGraph: {
      title: `${meta.label} in ${city} | DR Youth Clinic`,
      description: meta.description,
      url: `${SITE_URL}/${params.location}/services/${catSlug}`,
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const loc = locations[params.location];
  if (!loc) notFound();

  const catSlug = params.category.toLowerCase();

  // If not a valid category slug, check if it's an old service URL and redirect
  if (!CATEGORY_MAP[catSlug]) {
    const svc = await findServiceBySlug(params.location, params.category);
    if (svc) {
      redirect(`/${params.location}/services/${svc.category.toLowerCase()}/${svc.urlSlug}`);
    }
    notFound();
  }

  const dbCategory = CATEGORY_MAP[catSlug];
  const meta = CATEGORY_META[catSlug];
  const [services, siteConfig] = await Promise.all([
    getServicesForCategory(params.location, dbCategory),
    getSiteConfig(),
  ]);
  const city = loc.name;

  return (
    <main className="bg-white min-h-screen">

      {/* ── HERO ── */}
      <section className={`relative overflow-hidden bg-gradient-to-br ${meta.heroGrad} text-white`}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/[0.03] translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-white/[0.04] -translate-x-1/3 translate-y-1/3" />
          <span className="absolute bottom-0 right-8 text-[180px] leading-none opacity-[0.06] select-none">
            {meta.icon}
          </span>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-10 relative">
          <Link
            href={`/${params.location}/services`}
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition text-sm font-medium mb-6"
          >
            <ArrowLeft size={15} />
            All Treatments
          </Link>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-10 pb-20 md:pb-24 relative">
          <div className="max-w-2xl">
            <span className={`inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] ${meta.accentText} opacity-70 mb-6`}>
              <span className="w-6 h-px bg-current opacity-50" />
              {city} · {meta.tagline}
            </span>

            <div className="flex items-center gap-5 mb-5">
              <span className="text-5xl md:text-6xl">{meta.icon}</span>
              <div>
                <h1 className="text-4xl md:text-5xl font-headline font-extrabold leading-tight tracking-tight">
                  {meta.label}
                </h1>
                {services.length > 0 && (
                  <span className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full ${meta.pillBg} ${meta.pillText}`}>
                    {services.length} treatment{services.length !== 1 ? 's' : ''} available
                  </span>
                )}
              </div>
            </div>

            <p className="text-white/65 text-[15px] md:text-base leading-relaxed max-w-xl mb-8">
              {meta.description}
            </p>

            <Link
              href="/book"
              className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-7 py-3.5 rounded-xl font-bold shadow-lg hover:-translate-y-0.5 transition text-sm"
            >
              {siteConfig.consultationCta}
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── BREADCRUMB ── */}
      <nav className="bg-[#f6faff] border-b border-gray-100 py-3">
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center gap-1.5 text-sm text-gray-400">
          <Link href="/" className="hover:text-[#0B2560] transition">Home</Link>
          <span>/</span>
          <Link href={`/${params.location}`} className="hover:text-[#0B2560] transition capitalize">{city}</Link>
          <span>/</span>
          <Link href={`/${params.location}/services`} className="hover:text-[#0B2560] transition">Services</Link>
          <span>/</span>
          <span className="text-[#0B2560] font-semibold">{meta.label}</span>
        </div>
      </nav>

      {/* ── SERVICE GRID ── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-16">

        {services.length === 0 ? (
          <div className="text-center py-24 space-y-5">
            <span className="text-6xl">{meta.icon}</span>
            <h2 className="text-2xl font-headline font-bold text-[#0B2560]">
              {meta.label} treatments coming soon
            </h2>
            <p className="text-gray-400 max-w-md mx-auto">
              We're preparing specialised treatments for this category in {city}. Book a
              consultation and our specialists will guide you.
            </p>
            <Link
              href="/book"
              className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-7 py-3.5 rounded-xl font-bold text-sm hover:-translate-y-0.5 transition mt-4"
            >
              Book a Consultation
              <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl md:text-3xl font-headline font-bold text-[#0B2560]">
                {services.length} {meta.label} Treatment{services.length !== 1 ? 's' : ''} in {city}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((svc: any) => (
                <ServiceCard
                  key={String(svc._id)}
                  svc={svc}
                  location={params.location}
                  category={catSlug}
                />
              ))}
            </div>

            {/* Treatment Comparison Center */}
            {services.length >= 2 && (
              <div className="mt-16">
                <div className="text-center mb-6">
                  <p className="text-[#3B82C4] text-xs font-bold uppercase tracking-widest mb-1">Treatment Comparison Center</p>
                  <h3 className="text-2xl font-headline font-bold text-[#0B2560]">Compare {meta.label} Treatments</h3>
                  <p className="text-gray-400 text-sm mt-1">Side-by-side overview to help you find the right fit</p>
                </div>

                {/* Comparison table — horizontal scroll on mobile */}
                <div className="overflow-x-auto -mx-2 px-2">
                  <table className="w-full min-w-[540px] border-collapse rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                    <thead>
                      <tr className="bg-[#0B2560] text-white text-xs">
                        <th className="py-3 px-4 text-left font-semibold text-white/50 uppercase tracking-wider w-28">Attribute</th>
                        {services.slice(0, 4).map((s: any) => (
                          <th key={String(s._id)} className="py-3 px-4 text-left font-bold">{s.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {[
                        { label: 'Price from', getValue: (s: any) => `₹${(s.price ?? 0).toLocaleString('en-IN')}` },
                        { label: 'Duration', getValue: (s: any) => `${s.duration} min` },
                        { label: 'Sessions', getValue: (s: any) => s.sessionsRequired || '—' },
                        { label: 'Recovery', getValue: (s: any) => s.recoveryTime || 'Minimal' },
                        { label: 'Ideal for', getValue: (s: any) => s.idealFor?.slice(0, 2).join(', ') || '—' },
                      ].map((row, ri) => (
                        <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-[#f6faff]'}>
                          <td className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{row.label}</td>
                          {services.slice(0, 4).map((s: any) => (
                            <td key={String(s._id)} className="py-3 px-4 text-gray-700 font-medium">{row.getValue(s)}</td>
                          ))}
                        </tr>
                      ))}
                      <tr className="bg-[#f6faff]">
                        <td className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Book</td>
                        {services.slice(0, 4).map((s: any) => (
                          <td key={String(s._id)} className="py-3 px-4">
                            <Link
                              href={`/${params.location}/services/${catSlug}/${s.urlSlug}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#0B2560] hover:text-[#3B82C4] transition"
                            >
                              View <ArrowRight size={11} />
                            </Link>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="text-center mt-6">
                  <Link href="/book" className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-6 py-3 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition shadow-lg">
                    Get a Personalised Recommendation <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className={`bg-gradient-to-br ${meta.heroGrad} py-16 text-white`}>
        <div className="max-w-3xl mx-auto text-center px-6 space-y-4">
          <span className="text-4xl">{meta.icon}</span>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight">
            Ready to begin?
          </h2>
          <p className="text-white/60 max-w-md mx-auto">
            Book a {siteConfig.consultationFree ? 'free ' : ''}consultation with our {city} {meta.label.toLowerCase()} specialists today.
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
              href={`tel:${loc.phone}`}
              className="inline-flex items-center gap-2 border border-white/25 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition"
            >
              Call {loc.phone}
            </a>
          </div>
        </div>
      </section>

    </main>
  );
}

function ServiceCard({
  svc,
  location,
  category,
}: {
  svc: any;
  location: string;
  category: string;
}) {
  const hasIdealFor = svc.idealFor?.length > 0;

  return (
    <Link
      href={`/${location}/services/${category}/${svc.urlSlug}`}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* IMAGE */}
      <div className="relative h-52 bg-[#f6faff] overflow-hidden">
        {svc.heroImage?.url ? (
          <Image
            src={svc.heroImage.url}
            alt={svc.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl opacity-20">✨</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* price pill */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm text-[#0B2560] px-3 py-1.5 rounded-full shadow-sm">
          <IndianRupee size={12} className="shrink-0" />
          <span className="text-xs font-extrabold">{(svc.price ?? 0).toLocaleString('en-IN')}</span>
        </div>
        {/* duration pill */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm text-gray-600 px-3 py-1.5 rounded-full shadow-sm">
          <Clock size={11} className="shrink-0" />
          <span className="text-xs font-semibold">{svc.duration} min</span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="font-headline font-bold text-[#0B2560] text-lg leading-snug mb-1.5 group-hover:text-[#3b82f6] transition-colors">
          {svc.name}
        </h3>

        {/* Sessions + Recovery quick facts */}
        {(svc.sessionsRequired || svc.recoveryTime) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {svc.sessionsRequired && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 text-[#0B2560] px-2 py-1 rounded-full">
                <Zap size={9} className="text-[#3B82C4]" /> {svc.sessionsRequired}
              </span>
            )}
            {svc.recoveryTime && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-green-50 text-green-700 px-2 py-1 rounded-full">
                <CheckCircle size={9} /> {svc.recoveryTime}
              </span>
            )}
          </div>
        )}

        {(svc.heroDescription || svc.narrative) && (
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3">
            {svc.heroDescription || svc.narrative?.slice(0, 200)}
          </p>
        )}

        {/* idealFor tags */}
        {hasIdealFor && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {svc.idealFor.slice(0, 3).map((tag: string, i: number) => (
              <span key={i} className="text-[10px] bg-[#f6faff] border border-blue-50 text-gray-500 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* key benefits */}
        {svc.benefits?.length > 0 && (
          <ul className="space-y-1.5 mb-4">
            {svc.benefits.slice(0, 2).map((b: any, i: number) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-base leading-none shrink-0">{b.icon}</span>
                <span className="truncate">{b.title}</span>
              </li>
            ))}
          </ul>
        )}

        {/* CTA row */}
        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
          <span className="text-xs text-[#0B2560] font-semibold group-hover:text-[#3b82f6] transition-colors">View Treatment</span>
          <ArrowRight
            size={15}
            className="text-[#0B2560] group-hover:translate-x-1 group-hover:text-[#3b82f6] transition-all"
          />
        </div>
      </div>
    </Link>
  );
}
