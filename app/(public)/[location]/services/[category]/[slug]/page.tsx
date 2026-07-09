import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  CheckCircle, Clock, IndianRupee, ChevronRight, Phone, Calendar,
  ArrowLeft, Star, Shield, Users, BadgeCheck, MapPin, Zap, Cpu,
  X, ThumbsUp, Quote, Activity,
} from 'lucide-react';
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { Doctor } from '@/app/models/Doctor';
import { Review } from '@/app/models/Review';
import { locations } from '@/app/data/locations';
import EligibilityChecker from '@/app/components/EligibilityChecker';
import CostEstimator from '@/app/components/CostEstimator';
import BeforeAfterGallery from '@/app/components/BeforeAfterGallery';
import EMICalculator from '@/app/components/EMICalculator';
import SocialProofBar from '@/app/components/SocialProofBar';
import TreatmentJourney from '@/app/components/TreatmentJourney';

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

const CATEGORY_MAP: Record<string, string> = {
  skin: 'Skin', hair: 'Hair', laser: 'Laser', other: 'Other',
};
const CATEGORY_LABEL: Record<string, string> = {
  skin: 'Skin & Aesthetics', hair: 'Hair Restoration', laser: 'Laser Precision', other: 'Specialist Care',
};
const CATEGORY_ICON: Record<string, string> = {
  Skin: '✨', Hair: '🌿', Laser: '⚡', Other: '🏥',
};

// Fallback recovery-timeline template used when a service hasn't set its own
// Service.recoveryStages (Admin → Services → Treatment Journey).
const DEFAULT_RECOVERY_STAGES = [
  { phase: 'Day 1', icon: '🛌', label: 'Immediate', description: 'Mild redness or swelling is normal. Avoid sun exposure.' },
  { phase: 'Days 2–3', icon: '💧', label: 'Healing', description: 'Skin settles. Follow aftercare routine provided by your doctor.' },
  { phase: 'Week 1', icon: '🌱', label: 'Recovery', description: 'Most side effects resolve. Light activity resumed.' },
  { phase: 'Month 1+', icon: '✨', label: 'Results', description: 'Full results become visible. Follow-up appointment recommended.' },
];

interface PageProps {
  params: { location: string; category: string; slug: string };
}

async function getService(location: string, slug: string) {
  try {
    await connectDB();
    return Service.findOne({ urlSlug: slug, location: location.toLowerCase(), status: 'active' } as any).lean() as Promise<any | null>;
  } catch { return null; }
}

async function getRelatedServices(location: string, category: string, excludeSlug: string) {
  try {
    await connectDB();
    return Service.find({ location: location.toLowerCase(), category, status: 'active', urlSlug: { $ne: excludeSlug } } as any)
      .limit(3).lean() as Promise<any[]>;
  } catch { return []; }
}

async function getLocationDoctors(location: string) {
  try {
    await connectDB();
    return Doctor.find({ location: { $in: [location.toLowerCase(), 'all'] }, active: true } as any)
      .sort({ order: 1 }).limit(3).lean() as Promise<any[]>;
  } catch { return []; }
}

async function getServiceReviews(location: string, serviceName: string) {
  try {
    await connectDB();
    return Review.find({
      isVisible: true,
      $or: [
        { services: { $regex: serviceName, $options: 'i' } },
        { location: location.toLowerCase() },
      ],
    } as any)
      .sort({ isFeatured: -1, rating: -1 })
      .limit(3).lean() as Promise<any[]>;
  } catch { return []; }
}

async function getServiceAtOtherLocations(serviceName: string, currentLocation: string) {
  try {
    await connectDB();
    return Service.find({
      name: { $regex: `^${serviceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      location: { $ne: currentLocation.toLowerCase() },
      status: 'active',
    } as any).select('location').lean() as Promise<any[]>;
  } catch { return []; }
}

export async function generateStaticParams() {
  try {
    await connectDB();
    const services = await Service.find({ status: 'active' } as any).select('location category urlSlug').lean() as any[];
    return services.map((s) => ({ location: s.location, category: s.category.toLowerCase(), slug: s.urlSlug }));
  } catch { return []; }
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

  const [related, doctors, reviews, otherLocations] = await Promise.all([
    getRelatedServices(params.location, svc.category, params.slug),
    getLocationDoctors(params.location),
    getServiceReviews(params.location, svc.name),
    getServiceAtOtherLocations(svc.name, params.location),
  ]);

  const cityName = loc.name;
  const catLabel = CATEGORY_LABEL[catSlug] ?? svc.category;
  const beforeAfterPairs = svc.beforeAfterImages?.filter((p: any) => p.before?.url && p.after?.url) ?? [];
  const hasBeforeAfter = beforeAfterPairs.length > 0;
  const hasJourney = svc.treatmentSteps?.length > 0;
  const hasFAQ = svc.faq?.length > 0;
  const hasIdealFor = svc.idealFor?.length > 0;
  const hasTechnology = !!svc.technology?.trim();
  const hasMyths = svc.myths?.length > 0;
  const hasReviews = reviews.length > 0;
  const hasDoctors = doctors.length > 0;
  const hasRecovery = !!svc.recoveryTime?.trim();

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
            <span className="text-[#0B2560] font-semibold truncate max-w-[180px]">{svc.name}</span>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="relative bg-gradient-to-br from-[#0B2560] via-[#102d6e] to-[#1a4a8a] text-white overflow-hidden">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -right-24 w-[480px] h-[480px] rounded-full bg-white/[0.03]" />
            <div className="absolute -bottom-16 -left-16 w-[320px] h-[320px] rounded-full bg-white/[0.04]" />
            <div className="absolute top-1/2 right-1/3 w-[200px] h-[200px] rounded-full bg-[#F5A623]/[0.05]" />
          </div>

          <div className="max-w-7xl mx-auto px-6 md:px-10 pt-6 relative">
            <Link href={`/${params.location}/services/${catSlug}`} className="inline-flex items-center gap-2 text-white/50 hover:text-white/90 transition text-sm">
              <ArrowLeft size={14} /> {catLabel}
            </Link>
          </div>

          <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 grid md:grid-cols-2 gap-10 items-center relative">
            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-wider uppercase border border-white/10">
                {CATEGORY_ICON[svc.category] ?? '🏥'} {svc.category} Treatment
              </span>
              <h1 className="text-3xl md:text-5xl font-headline font-extrabold leading-tight tracking-tight">
                {svc.name}
                <span className="block text-[#F5A623] text-xl md:text-3xl mt-1 font-bold">in {cityName}</span>
              </h1>
              {svc.metaDescription && (
                <p className="text-white/70 text-base md:text-[17px] leading-relaxed max-w-lg">{svc.metaDescription}</p>
              )}

              {/* Quick stat badges */}
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="flex items-center gap-1.5 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full text-xs">
                  <Clock size={12} className="text-[#F5A623]" /> {svc.duration} min
                </span>
                {svc.sessionsRequired && (
                  <span className="flex items-center gap-1.5 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full text-xs">
                    <Zap size={12} className="text-[#F5A623]" /> {svc.sessionsRequired}
                  </span>
                )}
                {svc.recoveryTime && (
                  <span className="flex items-center gap-1.5 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full text-xs">
                    <BadgeCheck size={12} className="text-[#F5A623]" /> {svc.recoveryTime}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <Link href="/book">
                  <button className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-6 py-3.5 rounded-xl font-bold shadow-lg hover:-translate-y-0.5 transition text-sm">
                    <Calendar size={14} /> Book Free Consultation
                  </button>
                </Link>
                <a href={`tel:${loc.phone}`} className="inline-flex items-center gap-2 border border-white/30 text-white px-5 py-3.5 rounded-xl font-semibold hover:bg-white/10 transition text-sm">
                  <Phone size={14} /> {loc.phone}
                </a>
              </div>

              <div className="flex flex-wrap gap-5 text-xs text-white/50 border-t border-white/10 pt-4">
                <span className="flex items-center gap-1.5">
                  <IndianRupee size={11} className="text-[#F5A623]" />
                  From <strong className="text-white ml-0.5">₹{svc.price.toLocaleString('en-IN')}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={11} className="text-[#F5A623]" /> {cityName} Clinic
                </span>
              </div>
            </div>

            {svc.heroImage?.url ? (
              <div className="relative h-64 md:h-[420px] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <Image src={svc.heroImage.url} alt={`${svc.name} in ${cityName}`} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <div className="inline-flex items-center gap-2 bg-white/95 backdrop-blur text-[#0B2560] text-xs font-bold px-4 py-2 rounded-full shadow-lg">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Free consultation included
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 md:h-[420px] rounded-3xl bg-white/10 flex items-center justify-center text-7xl">
                {CATEGORY_ICON[svc.category] ?? '🏥'}
              </div>
            )}
          </div>
        </section>

        {/* ── TRUST BAR ── */}
        <section className="bg-[#0B2560] border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Star, label: '4.9★ Rating', sub: 'Across all locations' },
              { icon: Users, label: '25,000+', sub: 'Patients treated' },
              { icon: Shield, label: 'FDA Approved', sub: 'Technology & protocols' },
              { icon: BadgeCheck, label: '10+ Years', sub: 'Clinical experience' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3 text-white">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-[#F5A623]" />
                </div>
                <div>
                  <p className="font-bold text-xs">{label}</p>
                  <p className="text-white/40 text-[10px]">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── QUICK FACTS — horizontal scroll mobile, grid desktop ── */}
        <section className="bg-white border-b border-gray-50">
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-5">
            <div className="flex md:grid md:grid-cols-5 gap-3 overflow-x-auto md:overflow-visible pb-1 md:pb-0 scrollbar-hide -mx-2 px-2 md:mx-0 md:px-0">
              {[
                { label: 'Starting Price', value: `₹${svc.price.toLocaleString('en-IN')}`, icon: '💰' },
                { label: 'Session Duration', value: `${svc.duration} min`, icon: '⏱️' },
                { label: 'Sessions Needed', value: svc.sessionsRequired || 'Consult', icon: '🔄' },
                { label: 'Recovery Time', value: svc.recoveryTime || 'Varies', icon: '🌿' },
                { label: 'Category', value: svc.category, icon: CATEGORY_ICON[svc.category] },
              ].map((fact) => (
                <div key={fact.label} className="flex-shrink-0 w-40 md:w-auto bg-[#f6faff] rounded-2xl px-4 py-3 text-center border border-blue-50">
                  <div className="text-xl mb-1">{fact.icon}</div>
                  <div className="font-bold text-[#0B2560] text-sm">{fact.value}</div>
                  <div className="text-gray-400 text-[10px] mt-0.5">{fact.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── MOBILE QUICK-BOOK STRIP — sidebar booking card sits below ~10 content
             sections on mobile, so surface price + CTA early too ── */}
        <section className="lg:hidden bg-white border-b border-gray-50">
          <div className="max-w-7xl mx-auto px-6 py-5">
            <div className="rounded-3xl border border-gray-100 shadow-lg overflow-hidden">
              <div className="bg-[#0B2560] px-5 py-4 text-white flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Starting Price</p>
                  <p className="text-2xl font-extrabold">₹{svc.price.toLocaleString('en-IN')}</p>
                </div>
                {svc.recoveryTime && (
                  <span className="text-xs bg-white/10 px-3 py-1.5 rounded-full shrink-0">{svc.recoveryTime} recovery</span>
                )}
              </div>
              <div className="p-4 flex gap-2.5">
                <Link href="/book" className="flex-1">
                  <button className="w-full bg-[#0B2560] text-white py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
                    <Calendar size={14} /> Book Consultation
                  </button>
                </Link>
                <a href={`tel:${loc.phone}`} className="flex items-center justify-center gap-2 border-2 border-gray-100 text-[#0B2560] px-4 rounded-2xl font-semibold text-sm shrink-0">
                  <Phone size={14} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF BAR ── */}
        <SocialProofBar serviceName={svc.name} location={cityName} />

        {/* ── MAIN CONTENT GRID ── */}
        <section className="max-w-7xl mx-auto px-6 md:px-10 py-14 grid lg:grid-cols-3 gap-12">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-2 space-y-14">

            {/* Treatment at a Glance */}
            <div className="rounded-3xl border border-blue-50 bg-[#f6faff] p-6">
              <h2 className="text-lg font-headline font-bold text-[#0B2560] mb-4 flex items-center gap-2">
                <Activity size={18} className="text-[#3B82C4]" /> Treatment at a Glance
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Treatment Type', value: svc.category },
                  { label: 'Session Time', value: `${svc.duration} min` },
                  { label: 'Sessions Needed', value: svc.sessionsRequired || 'Consult' },
                  { label: 'Recovery', value: svc.recoveryTime || 'Minimal' },
                  { label: 'Starting Price', value: `₹${svc.price.toLocaleString('en-IN')}` },
                  { label: 'Anaesthesia', value: svc.anaesthesia || 'Topical / None' },
                ].map((row) => (
                  <div key={row.label} className="bg-white rounded-2xl p-3 border border-blue-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{row.label}</p>
                    <p className="font-bold text-[#0B2560] text-sm">{row.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Overview */}
            <div>
              <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-4">About This Treatment</h2>
              {svc.narrative && (
                <p className="text-gray-600 leading-relaxed text-[15px] whitespace-pre-line">{svc.narrative}</p>
              )}
              {hasIdealFor && (
                <div className="mt-6 p-5 bg-[#f6faff] rounded-2xl border border-blue-50">
                  <h3 className="text-xs font-bold text-[#0B2560] uppercase tracking-widest mb-3">Ideal for</h3>
                  <div className="flex flex-wrap gap-2">
                    {svc.idealFor.map((tag: string, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1.5 bg-white border border-blue-100 text-[#0B2560] px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm">
                        <CheckCircle size={10} className="text-[#3B82C4]" /> {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Technology */}
            {hasTechnology && (
              <div className="bg-gradient-to-br from-[#0B2560] to-[#1e3a8a] rounded-3xl p-8 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                    <Cpu size={18} className="text-[#F5A623]" />
                  </div>
                  <h2 className="text-xl font-headline font-bold">What Powers This Treatment</h2>
                </div>
                <p className="text-white/75 leading-relaxed text-sm">{svc.technology}</p>
              </div>
            )}

            {/* Treatment Journey */}
            {hasJourney && (
              <div>
                <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-7">Your Treatment Journey</h2>
                <div className="relative">
                  <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gradient-to-b from-[#0B2560]/20 to-transparent hidden sm:block" />
                  <div className="space-y-5">
                    {svc.treatmentSteps.map((step: any, i: number) => (
                      <div key={i} className="flex gap-4 relative">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-[#0B2560] text-white font-bold text-sm flex items-center justify-center shadow-md ring-4 ring-white z-10">
                          {i + 1}
                        </div>
                        <div className="flex-1 bg-[#f6faff] rounded-2xl p-4 border border-blue-50">
                          <h3 className="font-bold text-[#0B2560] text-sm mb-1">{step.title}</h3>
                          {step.description && <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>}
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
                <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-5">Key Benefits</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {svc.benefits.map((b: any, i: number) => (
                    <div key={i} className="group flex gap-4 p-5 rounded-2xl bg-[#f6faff] border border-blue-50 hover:border-[#3B82C4]/30 hover:shadow-md transition-all">
                      <span className="text-2xl shrink-0 mt-0.5">{b.icon}</span>
                      <div>
                        <p className="font-bold text-[#0B2560] text-sm mb-1">{b.title}</p>
                        {b.description && <p className="text-gray-500 text-sm leading-relaxed">{b.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Before / After — interactive gallery with filter + navigation */}
            {hasBeforeAfter && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-2xl font-headline font-bold text-[#0B2560]">Real Patient Results</h2>
                  <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border hidden sm:block">Unretouched photos</span>
                </div>
                <BeforeAfterGallery pairs={beforeAfterPairs} serviceName={svc.name} />
              </div>
            )}

            {/* Recovery Timeline */}
            {hasRecovery && (
              <div>
                <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-5">Recovery Timeline</h2>
                <div className="rounded-3xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                      <CheckCircle size={18} className="text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-green-800 text-sm">Total recovery: <span className="text-[#0B2560]">{svc.recoveryTime}</span></p>
                      <p className="text-green-600 text-xs">Most patients return to daily activities quickly</p>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-4 gap-3">
                    {(svc.recoveryStages?.length ? svc.recoveryStages : DEFAULT_RECOVERY_STAGES).map((phase: any, i: number) => (
                      <div key={i} className="bg-white rounded-2xl p-4 border border-green-100 text-center">
                        <div className="text-2xl mb-1.5">{phase.icon}</div>
                        <p className="font-bold text-[#0B2560] text-xs">{phase.phase}</p>
                        <p className="text-green-600 text-[10px] font-semibold mb-1.5">{phase.label}</p>
                        <p className="text-gray-500 text-[11px] leading-relaxed">{phase.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Myths vs Facts */}
            {hasMyths && (
              <div>
                <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-6">Myths vs. Facts</h2>
                <div className="space-y-4">
                  {svc.myths.map((item: any, i: number) => (
                    <div key={i} className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                      <div className="flex items-start gap-3 p-4 bg-red-50/60 border-b border-red-100/50">
                        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                          <X size={12} className="text-red-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-0.5">Myth</p>
                          <p className="text-gray-700 text-sm font-medium">{item.myth}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 bg-green-50/60">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                          <ThumbsUp size={12} className="text-green-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-0.5">Fact</p>
                          <p className="text-gray-700 text-sm">{item.fact}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Treatment Session Journey */}
            <TreatmentJourney
              sessions={svc.sessionsCount || 6}
              treatmentName={svc.name}
              phases={svc.journeyPhases}
            />

            {/* Patient Reviews */}
            {hasReviews && (
              <div>
                <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-5">What Patients Say</h2>
                <div className="space-y-4">
                  {reviews.map((r: any, i: number) => (
                    <div key={i} className="bg-[#f6faff] rounded-2xl p-5 border border-blue-50">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#0B2560]/10 flex items-center justify-center shrink-0 font-bold text-[#0B2560] text-sm">
                          {r.authorAvatar
                            ? <img src={r.authorAvatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                            : (r.authorName?.[0] ?? 'P')
                          }
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-bold text-sm text-[#0B2560]">{r.authorName}</span>
                            {r.rating && (
                              <span className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, s) => (
                                  <Star key={s} size={10} className={s < (r.rating ?? 0) ? 'text-[#F5A623] fill-[#F5A623]' : 'text-gray-200 fill-gray-200'} />
                                ))}
                              </span>
                            )}
                          </div>
                          {r.reviewText && (
                            <p className="text-gray-600 text-sm leading-relaxed">
                              <Quote size={12} className="inline text-[#3B82C4] mr-1 -mt-0.5" />
                              {r.reviewText}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FAQ */}
            {hasFAQ && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="text-2xl font-headline font-bold text-[#0B2560]">Frequently Asked Questions</h2>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 uppercase tracking-wide hidden sm:block">Rich Result</span>
                </div>
                <div className="space-y-3">
                  {svc.faq.map((item: any, i: number) => (
                    <details key={i} className="group border border-gray-100 rounded-2xl overflow-hidden hover:border-[#3B82C4]/30 transition-colors">
                      <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-semibold text-[#0B2560] text-sm leading-snug [list-style:none] [&::-webkit-details-marker]:hidden select-none hover:bg-[#f6faff] transition-colors">
                        <span className="pr-4">{item.question}</span>
                        <span className="text-[#3B82C4] text-xl font-light shrink-0 group-open:rotate-45 transition-transform duration-200 inline-block">+</span>
                      </summary>
                      <div className="px-5 pb-4 pt-1 text-gray-600 text-sm leading-relaxed border-t border-gray-50">
                        {item.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* Why DR Youth */}
            <div className="bg-gradient-to-br from-[#f6faff] to-white rounded-3xl p-7 border border-blue-50">
              <h2 className="text-xl font-headline font-bold text-[#0B2560] mb-5">Why Choose DR Youth Clinic?</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {WHY_US.map((point, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-gray-50 shadow-sm">
                    <CheckCircle size={15} className="text-[#3B82C4] mt-0.5 shrink-0" />
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
                  <h3 className="text-base font-headline font-bold leading-snug">{svc.name}</h3>
                  <p className="text-white/40 text-xs mt-0.5">{cityName} Clinic</p>
                </div>
                <div className="p-5 space-y-1">
                  {[
                    { label: 'Starting Price', value: `₹${svc.price.toLocaleString('en-IN')}`, bold: true },
                    { label: 'Duration', value: `${svc.duration} min` },
                    svc.sessionsRequired && { label: 'Sessions', value: svc.sessionsRequired },
                    svc.recoveryTime && { label: 'Recovery', value: svc.recoveryTime, color: 'text-[#3B82C4]' },
                  ].filter(Boolean).map((row: any, i, arr) => (
                    <div key={i} className={`flex justify-between items-center py-2.5 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <span className="text-xs text-gray-400">{row.label}</span>
                      <span className={`font-semibold text-sm ${row.bold ? 'text-2xl font-extrabold text-[#0B2560]' : row.color ?? 'text-gray-700'}`}>{row.value}</span>
                    </div>
                  ))}
                  <div className="pt-4 space-y-2.5">
                    <Link href="/book" className="block">
                      <button className="w-full bg-[#0B2560] text-white py-3.5 rounded-2xl font-bold text-sm shadow-[0_8px_24px_rgba(11,37,96,0.25)] hover:-translate-y-0.5 transition flex items-center justify-center gap-2">
                        <Calendar size={14} /> Book Consultation
                      </button>
                    </Link>
                    <a href={`tel:${loc.phone}`} className="flex items-center justify-center gap-2 border-2 border-gray-100 text-[#0B2560] py-3 rounded-2xl font-semibold text-sm hover:bg-[#f6faff] transition">
                      <Phone size={13} /> Call to Book
                    </a>
                    <p className="text-center text-xs text-gray-400 pt-1">Free consultation · No commitment</p>
                  </div>
                </div>
              </div>

              {/* Clinic info */}
              <div className="rounded-3xl border border-gray-100 p-5 bg-[#f6faff] space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.18em]">Our {cityName} Clinic</p>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin size={13} className="text-[#3B82C4] mt-0.5 shrink-0" />
                  <span className="text-xs">{loc.address}</span>
                </div>
                {loc.hours?.[0] && (
                  <div className="flex items-start gap-2 text-gray-400">
                    <Clock size={13} className="text-[#3B82C4] mt-0.5 shrink-0" />
                    <span className="text-xs">{loc.hours[0].day}: {loc.hours[0].hours}</span>
                  </div>
                )}
                <Link href={`/${params.location}`} className="text-xs font-semibold text-[#3B82C4] hover:text-[#0B2560] transition flex items-center gap-1 pt-1">
                  View full clinic details <ChevronRight size={11} />
                </Link>
              </div>

              {/* Available at other locations */}
              {otherLocations.length > 0 && (
                <div className="rounded-3xl border border-gray-100 p-5 space-y-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.18em]">Also available at</p>
                  {otherLocations.map((o: any) => (
                    <Link key={o.location} href={`/${o.location}/services/${catSlug}/${params.slug}`} className="flex items-center justify-between hover:bg-[#f6faff] rounded-xl p-2 -mx-2 transition group">
                      <span className="text-sm font-semibold text-[#0B2560] capitalize">{locations[o.location]?.name ?? o.location}</span>
                      <ChevronRight size={13} className="text-gray-300 group-hover:text-[#3B82C4] transition" />
                    </Link>
                  ))}
                </div>
              )}

              {/* Eligibility Checker */}
              <EligibilityChecker
                serviceName={svc.name}
                idealFor={svc.idealFor ?? []}
              />

              {/* Cost Estimator */}
              <CostEstimator
                basePrice={svc.price}
                sessionsRequired={svc.sessionsRequired}
                serviceName={svc.name}
              />

              {/* EMI Calculator */}
              <EMICalculator price={svc.price || 5000} />
            </div>
          </aside>
        </section>

        {/* ── OUR SPECIALISTS ── */}
        {hasDoctors && (
          <section className="bg-[#f6faff] py-14 border-t border-blue-50">
            <div className="max-w-7xl mx-auto px-6 md:px-10">
              <div className="mb-8">
                <h2 className="text-2xl font-headline font-bold text-[#0B2560]">Meet Your Specialists</h2>
                <p className="text-gray-500 text-sm mt-1">Expert dermatologists at our {cityName} clinic performing this treatment</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {doctors.map((doc: any) => (
                  <Link key={String(doc._id)} href={`/doctors/${doc._id}`} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                    <div className="shrink-0">
                      {doc.photo?.url ? (
                        <div className="relative w-16 h-16 rounded-2xl overflow-hidden">
                          <Image src={doc.photo.url} alt={doc.name} fill sizes="64px" className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-[#0B2560]/10 flex items-center justify-center text-2xl font-bold text-[#0B2560]">
                          {doc.name?.[0] ?? 'D'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0B2560] text-sm">{doc.name}</h3>
                      <p className="text-[#3B82C4] text-xs mt-0.5">{doc.title}</p>
                      {doc.experience > 0 && (
                        <p className="text-gray-400 text-xs mt-1">{doc.experience}+ years experience</p>
                      )}
                      {doc.specializations?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {doc.specializations.slice(0, 2).map((s: string) => (
                            <span key={s} className="text-[10px] bg-[#f6faff] border border-blue-50 text-[#0B2560] px-2 py-0.5 rounded-full">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── RELATED TREATMENTS ── */}
        {related.length > 0 && (
          <section className="bg-white py-14 border-t border-gray-50">
            <div className="max-w-7xl mx-auto px-6 md:px-10">
              <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
                <div>
                  <h2 className="text-2xl font-headline font-bold text-[#0B2560]">Related Treatments</h2>
                  <p className="text-gray-500 text-sm mt-1">More {catLabel.toLowerCase()} services at our {cityName} clinic</p>
                </div>
                <Link href={`/${params.location}/services/${catSlug}`} className="text-sm font-semibold text-[#0B2560] hover:text-[#3b82f6] transition flex items-center gap-1.5">
                  View all <ChevronRight size={14} />
                </Link>
              </div>

              {/* Mobile: horizontal scroll */}
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 sm:hidden -mx-6 px-6 scrollbar-hide">
                {related.map((r: any) => (
                  <Link key={String(r._id)} href={`/${r.location}/services/${r.category.toLowerCase()}/${r.urlSlug}`} className="snap-start shrink-0 w-64 group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-all">
                    {r.heroImage?.url ? (
                      <div className="relative h-36 overflow-hidden">
                        <Image src={r.heroImage.url} alt={r.name} fill sizes="256px" className="object-cover group-hover:scale-105 transition duration-500" />
                      </div>
                    ) : (
                      <div className="h-36 bg-gradient-to-br from-[#0B2560] to-[#1a4a8a] flex items-center justify-center text-4xl">{CATEGORY_ICON[r.category] ?? '🏥'}</div>
                    )}
                    <div className="p-4">
                      <h3 className="font-bold text-[#0B2560] text-sm leading-snug mb-2">{r.name}</h3>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className="font-bold text-[#0B2560]">₹{r.price.toLocaleString('en-IN')}</span>
                        <span>{r.duration} min</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop: grid */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {related.map((r: any) => (
                  <Link key={String(r._id)} href={`/${r.location}/services/${r.category.toLowerCase()}/${r.urlSlug}`} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg border border-gray-100 transition-all hover:-translate-y-1">
                    {r.heroImage?.url ? (
                      <div className="relative h-44 overflow-hidden">
                        <Image src={r.heroImage.url} alt={r.name} fill sizes="33vw" className="object-cover group-hover:scale-105 transition duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      </div>
                    ) : (
                      <div className="h-44 bg-gradient-to-br from-[#0B2560] to-[#1a4a8a] flex items-center justify-center text-4xl">{CATEGORY_ICON[r.category] ?? '🏥'}</div>
                    )}
                    <div className="p-5">
                      <h3 className="font-bold text-[#0B2560] mb-2 text-sm leading-snug group-hover:text-[#3B82C4] transition">{r.name}</h3>
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
        <section className="bg-gradient-to-br from-[#0B2560] to-[#1a4a8a] py-16 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white/[0.03] translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-[#F5A623]/[0.05] -translate-x-1/3 translate-y-1/3" />
          </div>
          <div className="max-w-2xl mx-auto px-6 relative">
            <p className="text-[#F5A623] text-xs font-bold uppercase tracking-widest mb-3">Ready to begin?</p>
            <h2 className="text-2xl md:text-4xl font-headline font-extrabold tracking-tight mb-3">
              Start Your {svc.name} Journey
            </h2>
            <p className="text-white/60 text-sm leading-relaxed mb-7">
              Book a free consultation with our {cityName} specialists and receive a personalised treatment plan.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/book">
                <button className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-7 py-3.5 rounded-2xl font-bold shadow-lg hover:-translate-y-0.5 transition text-sm">
                  <Calendar size={15} /> Book Free Consultation
                </button>
              </Link>
              <a href={`tel:${loc.phone}`} className="inline-flex items-center gap-2 border-2 border-white/20 text-white px-7 py-3.5 rounded-2xl font-semibold hover:bg-white/10 transition text-sm">
                <Phone size={15} /> {loc.phone}
              </a>
            </div>
            <p className="text-white/25 text-xs mt-5">Free consultation · No commitment · Personalised plan</p>
          </div>
        </section>

      </main>
    </>
  );
}
