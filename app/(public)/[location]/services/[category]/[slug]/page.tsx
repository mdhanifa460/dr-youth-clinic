import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  CheckCircle, Clock, IndianRupee, ChevronRight, Phone, Calendar,
  ArrowLeft, Star, Shield, Users, BadgeCheck, MapPin, Zap,
} from 'lucide-react';
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { locations } from '@/app/data/locations';

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

const CATEGORY_MAP: Record<string, string> = {
  skin: 'Skin',
  hair: 'Hair',
  laser: 'Laser',
  other: 'Other',
};

const CATEGORY_LABEL: Record<string, string> = {
  skin: 'Skin & Aesthetics',
  hair: 'Hair Restoration',
  laser: 'Laser Precision',
  other: 'Specialist Care',
};

const CATEGORY_ICON: Record<string, string> = {
  Skin: '✨',
  Hair: '🌿',
  Laser: '⚡',
  Other: '🏥',
};

interface PageProps {
  params: { location: string; category: string; slug: string };
}

async function getService(location: string, slug: string) {
  try {
    await connectDB();
    return Service.findOne({
      urlSlug: slug,
      location: location.toLowerCase(),
      status: 'active',
    } as any).lean() as Promise<any | null>;
  } catch {
    return null;
  }
}

async function getRelatedServices(location: string, category: string, excludeSlug: string) {
  try {
    await connectDB();
    return Service.find({
      location: location.toLowerCase(),
      category,
      status: 'active',
      urlSlug: { $ne: excludeSlug },
    } as any)
      .limit(3)
      .lean() as Promise<any[]>;
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  try {
    await connectDB();
    const services = await Service.find({ status: 'active' } as any)
      .select('location category urlSlug')
      .lean() as any[];
    return services.map((s) => ({
      location: s.location,
      category: s.category.toLowerCase(),
      slug: s.urlSlug,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const svc = await getService(params.location, params.slug);
  if (!svc) return {};
  const loc = locations[params.location];
  const city = loc?.name ?? params.location;
  const catSlug = params.category.toLowerCase();
  return {
    title: svc.metaTitle || `${svc.name} in ${city} | DR Youth Clinic`,
    description: svc.metaDescription || `Book ${svc.name} at DR Youth Clinic ${city}. Expert dermatologists, proven results.`,
    keywords: svc.keywords?.join(', '),
    alternates: { canonical: `${SITE_URL}/${params.location}/services/${catSlug}/${params.slug}` },
    openGraph: {
      title: svc.metaTitle || svc.name,
      description: svc.metaDescription || '',
      url: `${SITE_URL}/${params.location}/services/${catSlug}/${params.slug}`,
      images: svc.heroImage?.url ? [{ url: svc.heroImage.url, width: 1200, height: 630 }] : [],
      type: 'website',
      locale: 'en_IN',
    },
  };
}

function ServiceSchemas({ svc, cityName, params }: { svc: any; cityName: string; params: PageProps['params'] }) {
  const catSlug = params.category.toLowerCase();
  const pageUrl = `${SITE_URL}/${params.location}/services/${catSlug}/${params.slug}`;

  const schemas: any[] = [
    // MedicalProcedure
    {
      '@context': 'https://schema.org',
      '@type': 'MedicalProcedure',
      name: svc.name,
      description: svc.metaDescription || svc.narrative?.slice(0, 200) || '',
      procedureType: 'https://schema.org/TherapeuticProcedure',
      bodyLocation: svc.category,
      howPerformed: svc.narrative || '',
      preparation: 'Consult with our specialist before treatment',
      offers: {
        '@type': 'Offer',
        price: svc.price,
        priceCurrency: svc.currency || 'INR',
        availability: 'https://schema.org/InStock',
      },
      provider: {
        '@type': 'MedicalClinic',
        name: `DR Youth Clinic ${cityName}`,
        url: `${SITE_URL}/${svc.location}`,
      },
    },
    // BreadcrumbList
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: cityName, item: `${SITE_URL}/${params.location}` },
        { '@type': 'ListItem', position: 3, name: 'Services', item: `${SITE_URL}/${params.location}/services` },
        { '@type': 'ListItem', position: 4, name: svc.name, item: pageUrl },
      ],
    },
  ];

  // FAQPage schema — enables rich results in Google
  if (svc.faq?.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: svc.faq.map((item: any) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    });
  }

  return (
    <>
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
    </>
  );
}

const WHY_US = [
  'Expert dermatologists with 10+ years of clinical experience',
  'FDA-approved technology and evidence-based protocols',
  'Personalised treatment plans tailored to your skin biology',
  'Transparent pricing — no hidden costs, no upselling',
  'Post-treatment care with dedicated follow-up support',
];

export default async function ServiceDetailPage({ params }: PageProps) {
  const loc = locations[params.location];
  if (!loc) notFound();

  const catSlug = params.category.toLowerCase();
  if (!CATEGORY_MAP[catSlug]) notFound();

  const svc = await getService(params.location, params.slug);
  if (!svc) notFound();

  if (svc.category.toLowerCase() !== catSlug) notFound();

  const related = await getRelatedServices(params.location, svc.category, params.slug);
  const cityName = loc.name;
  const catLabel = CATEGORY_LABEL[catSlug] ?? svc.category;
  const hasBeforeAfter = svc.beforeAfterImages?.some((p: any) => p.before?.url && p.after?.url);
  const hasJourney = svc.treatmentSteps?.length > 0;
  const hasFAQ = svc.faq?.length > 0;
  const hasIdealFor = svc.idealFor?.length > 0;

  return (
    <>
      <ServiceSchemas svc={svc} cityName={cityName} params={params} />

      <main className="bg-white">

        {/* ── BREADCRUMB ── */}
        <nav className="bg-[#f6faff] border-b border-gray-100 py-3">
          <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center gap-1.5 text-sm text-gray-400 flex-wrap">
            <Link href="/" className="hover:text-[#0B2560] transition">Home</Link>
            <ChevronRight size={13} />
            <Link href={`/${params.location}`} className="hover:text-[#0B2560] transition capitalize">{cityName}</Link>
            <ChevronRight size={13} />
            <Link href={`/${params.location}/services`} className="hover:text-[#0B2560] transition">Services</Link>
            <ChevronRight size={13} />
            <Link href={`/${params.location}/services/${catSlug}`} className="hover:text-[#0B2560] transition">{catLabel}</Link>
            <ChevronRight size={13} />
            <span className="text-[#0B2560] font-semibold truncate max-w-[160px]">{svc.name}</span>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="relative bg-gradient-to-br from-[#0B2560] via-[#102d6e] to-[#1a4a8a] text-white overflow-hidden">
          {/* decorative circles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -right-24 w-[480px] h-[480px] rounded-full bg-white/[0.03]" />
            <div className="absolute -bottom-16 -left-16 w-[320px] h-[320px] rounded-full bg-white/[0.04]" />
            <div className="absolute top-1/2 left-1/3 w-[200px] h-[200px] rounded-full bg-[#F5A623]/[0.05]" />
          </div>

          <div className="max-w-7xl mx-auto px-6 md:px-10 pt-8 relative">
            <Link href={`/${params.location}/services/${catSlug}`} className="inline-flex items-center gap-2 text-white/50 hover:text-white/90 transition text-sm">
              <ArrowLeft size={14} /> {catLabel}
            </Link>
          </div>

          <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 grid md:grid-cols-2 gap-12 items-center relative">
            {/* Left */}
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-wider uppercase border border-white/10">
                {CATEGORY_ICON[svc.category] ?? '🏥'} {svc.category} Treatment
              </span>

              <h1 className="text-4xl md:text-5xl font-headline font-extrabold leading-tight tracking-tight">
                {svc.name}
                <span className="block text-[#F5A623] text-2xl md:text-3xl mt-1 font-bold">in {cityName}</span>
              </h1>

              {svc.metaDescription && (
                <p className="text-white/70 text-[17px] leading-relaxed max-w-lg">{svc.metaDescription}</p>
              )}

              {/* Quick badges */}
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="flex items-center gap-1.5 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full">
                  <Clock size={13} className="text-[#F5A623]" />
                  {svc.duration} min session
                </span>
                {svc.sessionsRequired && (
                  <span className="flex items-center gap-1.5 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full">
                    <Zap size={13} className="text-[#F5A623]" />
                    {svc.sessionsRequired}
                  </span>
                )}
                {svc.recoveryTime && (
                  <span className="flex items-center gap-1.5 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full">
                    <BadgeCheck size={13} className="text-[#F5A623]" />
                    {svc.recoveryTime}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <Link href="/book">
                  <button className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-7 py-3.5 rounded-xl font-bold shadow-lg hover:-translate-y-0.5 transition text-sm">
                    <Calendar size={15} /> Book Consultation
                  </button>
                </Link>
                <a href={`tel:${loc.phone}`} className="inline-flex items-center gap-2 border border-white/30 text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-white/10 transition text-sm">
                  <Phone size={15} /> {loc.phone}
                </a>
              </div>

              <div className="flex flex-wrap gap-6 text-sm text-white/60 pt-1 border-t border-white/10">
                <span className="flex items-center gap-1.5">
                  <IndianRupee size={13} className="text-[#F5A623]" />
                  Starting from <strong className="text-white ml-1">₹{svc.price.toLocaleString('en-IN')}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-[#F5A623]" />
                  {cityName} Clinic
                </span>
              </div>
            </div>

            {/* Right — hero image */}
            {svc.heroImage?.url ? (
              <div className="relative h-72 md:h-[440px] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <Image
                  src={svc.heroImage.url}
                  alt={`${svc.name} in ${cityName}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="inline-flex items-center gap-2 bg-white/95 backdrop-blur text-[#0B2560] text-xs font-bold px-4 py-2 rounded-full shadow-lg">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Free first consultation
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-72 md:h-[440px] rounded-3xl bg-white/10 flex items-center justify-center text-8xl">
                {CATEGORY_ICON[svc.category] ?? '🏥'}
              </div>
            )}
          </div>
        </section>

        {/* ── TRUST BAR ── */}
        <section className="bg-[#0B2560] border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Star, label: '4.9★ Rating', sub: 'Across all locations' },
              { icon: Users, label: '25,000+', sub: 'Patients treated' },
              { icon: Shield, label: 'FDA Approved', sub: 'Technology & protocols' },
              { icon: BadgeCheck, label: '10+ Years', sub: 'Clinical experience' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3 text-white">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-[#F5A623]" />
                </div>
                <div>
                  <p className="font-bold text-sm">{label}</p>
                  <p className="text-white/50 text-[11px]">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── MAIN CONTENT GRID ── */}
        <section className="max-w-7xl mx-auto px-6 md:px-10 py-16 grid lg:grid-cols-3 gap-12">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-2 space-y-16">

            {/* About + Ideal For */}
            <div className="space-y-6">
              <h2 className="text-2xl font-headline font-bold text-[#0B2560]">About This Treatment</h2>
              {svc.narrative && (
                <div className="text-gray-600 leading-relaxed text-[15px] whitespace-pre-line">{svc.narrative}</div>
              )}

              {hasIdealFor && (
                <div className="mt-6 p-6 bg-[#f6faff] rounded-2xl border border-blue-50">
                  <h3 className="text-sm font-bold text-[#0B2560] uppercase tracking-wide mb-3">Ideal for</h3>
                  <div className="flex flex-wrap gap-2">
                    {svc.idealFor.map((tag: string, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1.5 bg-white border border-blue-100 text-[#0B2560] px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm">
                        <CheckCircle size={11} className="text-[#3B82C4]" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Treatment Journey */}
            {hasJourney && (
              <div>
                <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-8">Your Treatment Journey</h2>
                <div className="relative">
                  {/* Connecting line */}
                  <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-[#0B2560]/20 via-[#3B82C4]/30 to-transparent" />

                  <div className="space-y-6">
                    {svc.treatmentSteps.map((step: any, i: number) => (
                      <div key={i} className="flex gap-5 relative">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-[#0B2560] text-white font-bold text-sm flex items-center justify-center shadow-md ring-4 ring-white z-10">
                          {i + 1}
                        </div>
                        <div className="flex-1 pb-2">
                          <h3 className="font-bold text-[#0B2560] text-base mb-1">{step.title}</h3>
                          {step.description && (
                            <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Key Benefits */}
            {svc.benefits?.length > 0 && (
              <div>
                <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-6">Key Benefits</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {svc.benefits.map((b: any, i: number) => (
                    <div key={i} className="group flex gap-4 p-5 rounded-2xl bg-[#f6faff] border border-blue-50 hover:border-[#3B82C4]/30 hover:shadow-md transition-all">
                      <span className="text-2xl shrink-0 mt-0.5 group-hover:scale-110 transition-transform">{b.icon}</span>
                      <div>
                        <p className="font-bold text-[#0B2560] text-sm mb-1">{b.title}</p>
                        {b.description && (
                          <p className="text-gray-500 text-sm leading-relaxed">{b.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Before / After */}
            {hasBeforeAfter && (
              <div>
                <div className="flex items-end justify-between mb-6">
                  <h2 className="text-2xl font-headline font-bold text-[#0B2560]">Real Patient Results</h2>
                  <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border">Unretouched photos</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  {svc.beforeAfterImages
                    .filter((p: any) => p.before?.url && p.after?.url)
                    .map((pair: any, i: number) => (
                      <div key={i} className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="grid grid-cols-2">
                          <div className="relative aspect-square">
                            <Image src={pair.before.url} alt={`${svc.name} before treatment`} fill sizes="200px" className="object-cover" />
                            <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded">BEFORE</span>
                          </div>
                          <div className="relative aspect-square">
                            <Image src={pair.after.url} alt={`${svc.name} after treatment`} fill sizes="200px" className="object-cover" />
                            <span className="absolute bottom-2 left-2 bg-[#0B2560]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded">AFTER</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                <p className="text-xs text-gray-400 mt-3 text-center">Results may vary. Individual outcomes depend on skin type, condition, and treatment plan.</p>
              </div>
            )}

            {/* FAQ */}
            {hasFAQ && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-2xl font-headline font-bold text-[#0B2560]">Frequently Asked Questions</h2>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 uppercase tracking-wide">Rich Result</span>
                </div>
                <div className="space-y-3">
                  {svc.faq.map((item: any, i: number) => (
                    <details key={i} className="group border border-gray-100 rounded-2xl overflow-hidden hover:border-[#3B82C4]/30 transition-colors">
                      <summary className="flex items-center justify-between px-6 py-5 cursor-pointer font-semibold text-[#0B2560] text-sm leading-snug [list-style:none] [&::-webkit-details-marker]:hidden select-none hover:bg-[#f6faff] transition-colors">
                        <span className="pr-4">{item.question}</span>
                        <span className="text-[#3B82C4] text-xl font-light shrink-0 group-open:rotate-45 transition-transform duration-200 inline-block">+</span>
                      </summary>
                      <div className="px-6 pb-5 pt-1 text-gray-600 text-sm leading-relaxed border-t border-gray-50">
                        {item.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* Why DR Youth */}
            <div className="bg-gradient-to-br from-[#f6faff] to-white rounded-3xl p-8 border border-blue-50">
              <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-6">Why Choose DR Youth Clinic?</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {WHY_US.map((point, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-gray-50 shadow-sm">
                    <CheckCircle size={16} className="text-[#3B82C4] mt-0.5 shrink-0" />
                    <p className="text-gray-700 text-sm leading-relaxed">{point}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── STICKY SIDEBAR ── */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">

              {/* Booking card */}
              <div className="rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                <div className="bg-[#0B2560] px-6 py-5 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-1">Book This Treatment</p>
                  <h3 className="text-lg font-headline font-bold leading-snug">{svc.name}</h3>
                  <p className="text-white/50 text-xs mt-1">{cityName} Clinic</p>
                </div>

                <div className="p-6 space-y-1">
                  <div className="flex justify-between items-center py-3 border-b border-gray-50">
                    <span className="text-sm text-gray-400">Starting Price</span>
                    <span className="text-2xl font-extrabold text-[#0B2560]">₹{svc.price.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-50">
                    <span className="text-sm text-gray-400">Session Duration</span>
                    <span className="font-semibold text-gray-800 text-sm">{svc.duration} minutes</span>
                  </div>
                  {svc.sessionsRequired && (
                    <div className="flex justify-between items-center py-3 border-b border-gray-50">
                      <span className="text-sm text-gray-400">Sessions</span>
                      <span className="font-semibold text-gray-800 text-sm">{svc.sessionsRequired}</span>
                    </div>
                  )}
                  {svc.recoveryTime && (
                    <div className="flex justify-between items-center py-3 border-b border-gray-50">
                      <span className="text-sm text-gray-400">Recovery</span>
                      <span className="font-semibold text-[#3B82C4] text-sm">{svc.recoveryTime}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-3">
                    <span className="text-sm text-gray-400">Category</span>
                    <span className="font-semibold text-gray-800 text-sm">{CATEGORY_ICON[svc.category]} {svc.category}</span>
                  </div>

                  <div className="pt-4 space-y-3">
                    <Link href="/book" className="block">
                      <button className="w-full bg-[#0B2560] text-white py-4 rounded-2xl font-bold text-sm shadow-[0_8px_24px_rgba(11,37,96,0.25)] hover:-translate-y-0.5 transition flex items-center justify-center gap-2">
                        <Calendar size={15} /> Book Consultation
                      </button>
                    </Link>
                    <a href={`tel:${loc.phone}`} className="flex items-center justify-center gap-2 border-2 border-gray-100 text-[#0B2560] py-3 rounded-2xl font-semibold text-sm hover:bg-[#f6faff] hover:border-[#0B2560]/20 transition">
                      <Phone size={14} /> Call to Book
                    </a>
                    <p className="text-center text-xs text-gray-400 pt-1">Free first consultation · No commitment</p>
                  </div>
                </div>
              </div>

              {/* Clinic info */}
              <div className="rounded-3xl border border-gray-100 p-5 space-y-3 bg-[#f6faff]">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.18em]">Our {cityName} Clinic</p>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin size={14} className="text-[#3B82C4] mt-0.5 shrink-0" />
                  <span>{loc.address}</span>
                </div>
                {loc.hours?.[0] && (
                  <div className="flex items-start gap-2 text-sm text-gray-500">
                    <Clock size={14} className="text-[#3B82C4] mt-0.5 shrink-0" />
                    <span>{loc.hours[0].day}: {loc.hours[0].hours}</span>
                  </div>
                )}
                <Link href={`/${params.location}`} className="text-xs font-semibold text-[#3B82C4] hover:text-[#0B2560] transition flex items-center gap-1">
                  View clinic details <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          </aside>
        </section>

        {/* ── RELATED SERVICES ── */}
        {related.length > 0 && (
          <section className="bg-[#f6faff] py-16 border-t border-blue-50">
            <div className="max-w-7xl mx-auto px-6 md:px-10">
              <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
                <div>
                  <h2 className="text-2xl font-headline font-bold text-[#0B2560]">More {svc.category} Treatments</h2>
                  <p className="text-gray-500 text-sm mt-1">Explore other {catLabel.toLowerCase()} services at our {cityName} clinic</p>
                </div>
                <Link href={`/${params.location}/services/${catSlug}`} className="text-sm font-semibold text-[#0B2560] hover:text-[#3b82f6] transition flex items-center gap-1.5">
                  View all <ChevronRight size={15} />
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {related.map((r: any) => (
                  <Link
                    key={String(r._id)}
                    href={`/${r.location}/services/${r.category.toLowerCase()}/${r.urlSlug}`}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg border border-gray-100 transition-all hover:-translate-y-1"
                  >
                    {r.heroImage?.url ? (
                      <div className="relative h-44 overflow-hidden">
                        <Image src={r.heroImage.url} alt={r.name} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover group-hover:scale-105 transition duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      </div>
                    ) : (
                      <div className="h-44 bg-gradient-to-br from-[#0B2560] to-[#1a4a8a] flex items-center justify-center text-4xl">
                        {CATEGORY_ICON[r.category] ?? '🏥'}
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="font-bold text-[#0B2560] mb-3 group-hover:text-[#3B82C4] transition text-sm leading-snug">{r.name}</h3>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-[#0B2560]">₹{r.price.toLocaleString('en-IN')}</span>
                        <span className="text-gray-400 text-xs">{r.duration} min</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── BOTTOM CTA ── */}
        <section className="bg-gradient-to-br from-[#0B2560] to-[#1a4a8a] py-20 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white/[0.03] translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-[#F5A623]/[0.05] -translate-x-1/3 translate-y-1/3" />
          </div>
          <div className="max-w-2xl mx-auto px-6 relative">
            <p className="text-[#F5A623] text-sm font-bold uppercase tracking-widest mb-3">Ready to begin?</p>
            <h2 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight mb-4">
              Start Your {svc.name} Journey
            </h2>
            <p className="text-white/60 text-[15px] leading-relaxed mb-8">
              Book a free consultation with our {cityName} specialists and receive a personalised treatment plan tailored to your skin.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/book">
                <button className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-8 py-4 rounded-2xl font-bold shadow-lg hover:-translate-y-0.5 transition text-sm">
                  <Calendar size={16} /> Book Free Consultation
                </button>
              </Link>
              <a href={`tel:${loc.phone}`} className="inline-flex items-center gap-2 border-2 border-white/20 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-white/10 hover:border-white/40 transition text-sm">
                <Phone size={16} /> {loc.phone}
              </a>
            </div>
            <p className="text-white/30 text-xs mt-6">Free consultation · No commitment · Personalised plan</p>
          </div>
        </section>

      </main>
    </>
  );
}
