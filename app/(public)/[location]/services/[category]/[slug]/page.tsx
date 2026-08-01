import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import FocalImage from '@/app/components/media/FocalImage';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  CheckCircle, Clock, IndianRupee, ChevronRight, Phone, Calendar,
  ArrowLeft, Star, Shield, Users, BadgeCheck, MapPin, Zap, Cpu,
  X, ThumbsUp, Quote,
} from 'lucide-react';
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { Doctor } from '@/app/models/Doctor';
import { Review } from '@/app/models/Review';
import { Result } from '@/app/models/Result';
import SliderCard from '@/app/components/SliderCard';
import { locations } from '@/app/data/locations';
import { getSiteConfig } from '@/app/lib/siteConfig';
import { getSettings } from '@/app/models/Settings';
import BlockRenderer from '@/app/components/contentblocks/BlockRenderer';
import { blocksToPlainText, hasVisibleBlockType } from '@/app/lib/contentBlocks/types';
import { resolveRelatedLinks, resolveReferencedDoctors, resolveReferencedVideos } from '@/app/lib/contentBlocks/relatedContent';
import EligibilityChecker from '@/app/components/EligibilityChecker';
import { resolveBanner } from '@/app/lib/banners/resolveBanner';
import BannerCarousel from '@/app/components/banners/BannerCarousel';
import BannerRenderer from '@/app/components/banners/BannerRenderer';
import CostEstimator from '@/app/components/CostEstimator';
import RelatedServicesPager from '@/app/components/RelatedServicesPager';
import BeforeAfterGallery from '@/app/components/BeforeAfterGallery';
import EMICalculator from '@/app/components/EMICalculator';
import SocialProofBar from '@/app/components/SocialProofBar';
import { renderZoneSections } from '@/app/components/layoutEngine/renderZoneSections';
import TreatmentJourney from '@/app/components/TreatmentJourney';
import AiJourneySimulator from '@/app/components/AiJourneySimulator';
import TreatmentJourneyExplorer from '@/app/components/TreatmentJourneyExplorer';
import TreatmentComparison from '@/app/components/TreatmentComparison';
import AftercareCalendar from '@/app/components/AftercareCalendar';
import FaqAccordion from '@/app/components/FaqAccordion';
import BenefitsGrid from '@/app/components/BenefitsGrid';
import TreatmentStepsList from '@/app/components/TreatmentStepsList';
import RecoveryTimeline from '@/app/components/RecoveryTimeline';
import ServiceStickyDesktopCta from '@/app/components/ServiceStickyDesktopCta';
import { getServiceCities, getEffectiveSeo, getEffectiveSlug } from '@/app/lib/serviceSeo';

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

interface PageProps {
  params: { location: string; category: string; slug: string };
}

// A service's slug can now be overridden per city (locationSeo[]), which
// can't be resolved in a single flat Mongo query since it lives in a sparse
// sub-array — fetch the (small, per-clinic-catalog) candidate set visible at
// this city once, then resolve the effective slug for that city in JS.
//
// Two cache layers, same reasoning as getSiteConfig (app/lib/siteConfig.ts):
// - unstable_cache: cross-request/cross-build. At build time this route is
//   statically generated for every (location, category, slug) combination —
//   ~480 pages across just 4 distinct locations — and previously each page
//   ran its OWN full Service.find() over every active service at that city
//   (twice per page, see below). Sharing one cached fetch per location
//   collapses that to 4 real queries total, not ~480 — directly reduces the
//   concurrent-connection burst against Atlas's free-tier pool that's
//   caused intermittent MongoNetworkError build failures this session.
// - React cache(): generateMetadata and the page component both need this
//   same candidate set within one request; fetch() gets this deduping
//   automatically, arbitrary Mongoose calls don't.
// getRelatedServices used to run its OWN second full query identical to
// getService's — both now read from this one shared fetch instead.
const getCachedServiceCandidates = unstable_cache(
  async (location: string) => {
    await connectDB();
    const loc = location.toLowerCase();
    return Service.find({
      status: 'active',
      $or: [
        { targetLocations: loc },
        { targetLocations: { $exists: false }, location: { $in: [loc, 'all'] } },
      ],
    } as any).lean();
  },
  ['service-candidates-by-location'],
  { revalidate: 300, tags: ['services'] }
);

const getServiceCandidates = cache(async (location: string) => {
  return getCachedServiceCandidates(location.toLowerCase()) as Promise<any[]>;
});

async function getService(location: string, slug: string) {
  try {
    const candidates = await getServiceCandidates(location);
    return candidates.find((s) => getEffectiveSlug(s, location.toLowerCase()) === slug) ?? null;
  } catch { return null; }
}

// Cap at 24 — enough to fill several pages of the Related Treatments pager
// (Settings → Display's relatedServicesCount controls the per-page size,
// this just bounds the total pool fetched) without pulling in every service
// in the category on a large catalogue.
const MAX_RELATED_SERVICES = 24;

async function getRelatedServices(location: string, category: string, excludeSlug: string) {
  try {
    const loc = location.toLowerCase();
    const candidates = await getServiceCandidates(location);
    return candidates
      .filter((s) => s.category === category && getEffectiveSlug(s, loc) !== excludeSlug)
      .slice(0, MAX_RELATED_SERVICES);
  } catch { return []; }
}

async function getLocationDoctors(location: string) {
  try {
    await connectDB();
    // Was querying a non-existent `location` field (Doctor's real field is
    // the plural `locations` array) — matched zero documents ever, so this
    // always silently returned an empty list.
    return Doctor.find({ locations: { $in: [location.toLowerCase(), 'all'] }, active: true } as any)
      .sort({ order: 1 }).limit(3).lean() as Promise<any[]>;
  } catch { return []; }
}

async function getServiceResults(serviceId: string) {
  try {
    await connectDB();
    const docs = await (Result as any)
      .find({ service: serviceId, status: 'published' })
      .sort({ order: 1, createdAt: -1 })
      .limit(3)
      .lean();
    return JSON.parse(JSON.stringify(docs));
  } catch { return []; }
}

async function getServiceReviews(location: string, serviceName: string) {
  try {
    await connectDB();
    const settings = await getSettings();
    const minRating = settings.content?.testimonialMinRating ?? 1;
    return Review.find({
      isVisible: true,
      rating: { $gte: minRating },
      $or: [
        { services: { $regex: serviceName, $options: 'i' } },
        { location: location.toLowerCase() },
      ],
    } as any)
      .sort({ isFeatured: -1, rating: -1 })
      .limit(3).lean() as Promise<any[]>;
  } catch { return []; }
}

// "Also available at" — the same service's OTHER target cities (derived
// straight from the doc itself, no query needed), plus any separate legacy
// documents sharing the same name that predate per-city targeting.
async function getServiceAtOtherLocations(svc: any, currentLocation: string) {
  const ownCities = getServiceCities(svc);
  const sameDocOthers = ownCities
    .filter((c) => c !== currentLocation)
    .map((c) => ({ location: c, urlSlug: getEffectiveSlug(svc, c) }));

  try {
    await connectDB();
    const legacyDocs = await Service.find({
      _id: { $ne: svc._id },
      name: { $regex: `^${String(svc.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      status: 'active',
    } as any).select('location targetLocations urlSlug locationSeo').lean() as any[];

    const seen = new Set(sameDocOthers.map((o) => o.location));
    const merged = [...sameDocOthers];
    for (const d of legacyDocs) {
      for (const c of getServiceCities(d)) {
        if (seen.has(c)) continue;
        seen.add(c);
        merged.push({ location: c, urlSlug: getEffectiveSlug(d, c) });
      }
    }
    return merged;
  } catch {
    return sameDocOthers;
  }
}

export async function generateStaticParams() {
  try {
    await connectDB();
    const services = await Service.find({ status: 'active' } as any)
      .select('location targetLocations category urlSlug locationSeo').lean() as any[];
    // A service can now show at several cities (targetLocations, or the
    // legacy 'all') with a different slug per city — generate one static
    // path per city it's actually shown at, using that city's effective slug.
    return services.flatMap((s) =>
      getServiceCities(s).map((location) => ({
        location,
        category: s.category.toLowerCase(),
        slug: getEffectiveSlug(s, location),
      }))
    );
  } catch { return []; }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const svc = await getService(params.location, params.slug);
  if (!svc) return {};
  const loc = locations[params.location];
  const city = loc?.name ?? params.location;
  const catSlug = params.category.toLowerCase();
  const seo = getEffectiveSeo(svc, params.location.toLowerCase());
  return {
    title: seo.metaTitle || `${svc.name} in ${city}`,
    description: seo.metaDescription || `Book ${svc.name} at DR Youth Clinic ${city}. Expert dermatologists, proven results.`,
    keywords: svc.keywords?.join(', '),
    alternates: { canonical: `${SITE_URL}/${params.location}/services/${catSlug}/${params.slug}` },
    openGraph: {
      title: seo.metaTitle || svc.name,
      description: seo.metaDescription || '',
      url: `${SITE_URL}/${params.location}/services/${catSlug}/${params.slug}`,
      images: svc.heroImage?.url ? [{ url: svc.heroImage.url, width: 1200, height: 630 }] : [],
      type: 'website',
      locale: 'en_IN',
    },
  };
}

function ServiceSchemas({ svc, cityName, params, schemaType }: { svc: any; cityName: string; params: PageProps['params']; schemaType: string }) {
  const catSlug = params.category.toLowerCase();
  const pageUrl = `${SITE_URL}/${params.location}/services/${catSlug}/${params.slug}`;
  const seo = getEffectiveSeo(svc, params.location.toLowerCase());

  const schemas: any[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'MedicalProcedure',
      name: svc.name,
      description: seo.metaDescription || blocksToPlainText(svc.narrativeBlocks, 200) || svc.narrative?.slice(0, 200) || '',
      procedureType: 'https://schema.org/TherapeuticProcedure',
      bodyLocation: svc.category,
      howPerformed: blocksToPlainText(svc.narrativeBlocks, 5000) || svc.narrative || '',
      preparation: 'Consult with our specialist before treatment',
      offers: {
        '@type': 'Offer',
        price: svc.price,
        priceCurrency: svc.currency || 'INR',
        availability: 'https://schema.org/InStock',
      },
      provider: {
        '@type': schemaType,
        name: `DR Youth Clinic ${cityName}`,
        url: `${SITE_URL}/${params.location}`,
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

// Fallback trust points used when a service hasn't set its own
// Service.whyChooseUs (Admin → Services → Benefits & Results Gallery).
const DEFAULT_WHY_US = [
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

  const [related, doctors, reviews, otherLocations, siteConfig, referencedDoctors, relatedLinks, referencedVideos, serviceBanners, documentedResults] = await Promise.all([
    getRelatedServices(params.location, svc.category, params.slug),
    getLocationDoctors(params.location),
    getServiceReviews(params.location, svc.name),
    getServiceAtOtherLocations(svc, params.location.toLowerCase()),
    getSiteConfig(),
    resolveReferencedDoctors(svc.narrativeBlocks),
    resolveRelatedLinks(svc.narrativeBlocks),
    resolveReferencedVideos(svc.narrativeBlocks),
    // params.slug is what an admin sees in the browser URL and types into a
    // banner's targetServices list — svc.urlSlug is the service's *base*
    // slug and can differ from params.slug whenever a per-city slug
    // override exists (see getEffectiveSlug in app/lib/serviceSeo.ts), which
    // silently broke banner matching for any service with a city override.
    resolveBanner({ page: 'service', location: params.location, service: params.slug }),
    getServiceResults(svc._id),
  ]);

  const cityName = loc.name;
  const catLabel = CATEGORY_LABEL[catSlug] ?? svc.category;
  const beforeAfterPairs = svc.beforeAfterImages?.filter((p: any) => p.before?.url && p.after?.url) ?? [];
  const hasBeforeAfter = siteConfig.showBeforeAfterOnPublic && beforeAfterPairs.length > 0;
  const hasJourney = svc.treatmentSteps?.length > 0;
  const hasFAQ = svc.faq?.length > 0;
  const hasIdealFor = svc.idealFor?.length > 0;
  const hasTechnology = !!svc.technology?.trim();
  const hasMyths = svc.myths?.length > 0;
  const hasReviews = reviews.length > 0;
  const hasDoctors = doctors.length > 0;
  const hasRecovery = !!svc.recoveryTime?.trim();
  // A "reference" content block (Content Block Builder) lets an admin move
  // any of these sections into the narrative flow — once they do, the fixed
  // position below must stand down, or the same content renders twice.
  const inBlocks = (type: string) => hasVisibleBlockType(svc.narrativeBlocks, type as any);

  // Content Layout Engine — sidebar is a full swap (old hardcoded widget
  // stack replaced entirely), main content is additive (extra registry
  // sections appended after the existing narrative, which stays untouched).
  // Both opt in per service via `layoutEngineEnabled`. Hero/related/
  // before-footer stay on the hardcoded renderer for now.
  const [layoutEngineSidebar, layoutEngineMain] = svc.layoutEngineEnabled
    ? await Promise.all([
        renderZoneSections({
          pageType: 'service',
          pageId: String(svc._id),
          context: { page: { price: svc.price, name: svc.name } },
          zone: 'sidebar',
        }),
        renderZoneSections({
          pageType: 'service',
          pageId: String(svc._id),
          context: { page: { price: svc.price, name: svc.name } },
          zone: 'main',
        }),
      ])
    : [null, null];

  return (
    <>
      <ServiceSchemas svc={svc} cityName={cityName} params={params} schemaType={siteConfig.schemaType} />

      <main className="bg-white">

        {/* ── BREADCRUMB ── */}
        <nav className="bg-[#f6faff] border-b border-gray-100 py-3">
          <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center gap-1.5 text-sm text-gray-500 flex-wrap">
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
        {/* Matching Banner(s) (admin-configured) take over this slot when
            any exist — as a carousel when there's more than one; otherwise
            the original hardcoded hero below renders unchanged. */}
        {serviceBanners.length > 0 ? (
          <BannerCarousel slides={serviceBanners.map((b: any) => <BannerRenderer key={String(b._id)} banner={b} />)} />
        ) : (
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
              {svc.heroDescription && (
                <p className="text-white/70 text-base md:text-[17px] leading-relaxed max-w-lg">{svc.heroDescription}</p>
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
                    <Calendar size={14} /> {siteConfig.consultationCta}
                  </button>
                </Link>
                <a href={`tel:${loc.phone}`} className="inline-flex items-center gap-2 border border-white/30 text-white px-5 py-3.5 rounded-xl font-semibold hover:bg-white/10 transition text-sm">
                  <Phone size={14} /> {loc.phone}
                </a>
              </div>

              <div className="flex flex-wrap gap-5 text-xs text-white/50 border-t border-white/10 pt-4">
                {siteConfig.showPriceOnCards && (
                  <span className="flex items-center gap-1.5">
                    <IndianRupee size={11} className="text-[#F5A623]" />
                    From <strong className="text-white ml-0.5">₹{svc.price.toLocaleString('en-IN')}</strong>
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <MapPin size={11} className="text-[#F5A623]" /> {cityName} Clinic
                </span>
              </div>
            </div>

            {/* 3:2 — the site's Service Hero ratio standard (distinct from
                the 4:5 Service Card ratio used in listings) */}
            <FocalImage
              image={svc.heroImage}
              aspectRatio="3/2"
              sizes="(max-width: 768px) 100vw, 50vw"
              alt={`${svc.name} in ${cityName}`}
              className="rounded-3xl shadow-2xl ring-1 ring-white/10 bg-white/10"
              fallbackEmoji={CATEGORY_ICON[svc.category] ?? '🏥'}
              priority
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4">
                <div className="inline-flex items-center gap-2 bg-white/95 backdrop-blur text-[#0B2560] text-xs font-bold px-4 py-2 rounded-full shadow-lg">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  {siteConfig.consultationFree ? 'Free consultation included' : 'Consultation included'}
                </div>
              </div>
            </FocalImage>
          </div>
        </section>
        )}

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
            {(() => {
              const quickFacts = [
                { label: 'Starting Price', value: `₹${svc.price.toLocaleString('en-IN')}`, icon: '💰', priceOnly: true },
                { label: 'Session Duration', value: `${svc.duration} min`, icon: '⏱️' },
                { label: 'Sessions Needed', value: svc.sessionsRequired || 'Consult', icon: '🔄' },
                { label: 'Recovery Time', value: svc.recoveryTime || 'Varies', icon: '🌿' },
                { label: 'Anaesthesia', value: svc.anaesthesia || 'Topical / None', icon: '💉' },
                { label: 'Category', value: svc.category, icon: CATEGORY_ICON[svc.category] },
              ].filter((f) => !f.priceOnly || siteConfig.showPriceOnCards);
              return (
                <div className={`flex md:grid ${quickFacts.length === 6 ? 'md:grid-cols-6' : 'md:grid-cols-5'} gap-3 overflow-x-auto md:overflow-visible pb-1 md:pb-0 scrollbar-hide -mx-2 px-2 md:mx-0 md:px-0`}>
                  {quickFacts.map((fact) => (
                    <div key={fact.label} className="flex-shrink-0 w-40 md:w-auto bg-[#f6faff] rounded-2xl px-4 py-3 text-center border border-blue-50">
                      <div className="text-xl mb-1">{fact.icon}</div>
                      <div className="font-bold text-[#0B2560] text-sm">{fact.value}</div>
                      <div className="text-gray-500 text-[10px] mt-0.5">{fact.label}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </section>

        {/* ── MOBILE QUICK-BOOK STRIP — sidebar booking card sits below ~10 content
             sections on mobile, so surface price + CTA early too ── */}
        <section className="lg:hidden bg-white border-b border-gray-50">
          <div className="max-w-7xl mx-auto px-6 py-5">
            <div className="rounded-3xl border border-gray-100 shadow-lg overflow-hidden">
              <div className="bg-[#0B2560] px-5 py-4 text-white flex items-center justify-between gap-3">
                {siteConfig.showPriceOnCards ? (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Starting Price</p>
                    <p className="text-2xl font-extrabold">₹{svc.price.toLocaleString('en-IN')}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{svc.name}</p>
                    <p className="text-lg font-extrabold">Book a consultation</p>
                  </div>
                )}
                {svc.recoveryTime && (
                  <span className="text-xs bg-white/10 px-3 py-1.5 rounded-full shrink-0">{svc.recoveryTime} recovery</span>
                )}
              </div>
              <div className="p-4 flex gap-2.5">
                <Link href="/book" className="flex-1">
                  <button className="w-full bg-[#0B2560] text-white py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
                    <Calendar size={14} /> {siteConfig.consultationCta}
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

            {/* Overview */}
            <div>
              <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-4">About This Treatment</h2>
              {svc.narrativeBlocks?.length > 0 ? (
                <BlockRenderer
                  blocks={svc.narrativeBlocks}
                  serviceContext={{
                    faq: svc.faq,
                    benefits: svc.benefits,
                    treatmentSteps: svc.treatmentSteps,
                    recoveryTime: svc.recoveryTime,
                    recoveryStages: svc.recoveryStages,
                    journeyPhases: svc.journeyPhases,
                    sessionsCount: svc.sessionsCount,
                    serviceName: svc.name,
                    journeyExplorer: svc.journeyExplorer,
                    journeyExplorerVisible: svc.journeyExplorerVisible,
                    painLevel: svc.painLevel,
                    comparisonVisible: svc.comparisonVisible,
                    current: { _id: String(svc._id), name: svc.name, price: svc.price, duration: svc.duration, sessionsRequired: svc.sessionsRequired, recoveryTime: svc.recoveryTime, painLevel: svc.painLevel, idealFor: svc.idealFor },
                    relatedServices: related.slice(0, 2).map((r: any) => ({ _id: String(r._id), name: r.name, price: r.price, duration: r.duration, sessionsRequired: r.sessionsRequired, recoveryTime: r.recoveryTime, painLevel: r.painLevel, idealFor: r.idealFor })),
                    doctors: referencedDoctors,
                    videos: referencedVideos,
                    showPrice: siteConfig.showPriceOnCards,
                  }}
                  relatedLinks={relatedLinks}
                />
              ) : svc.narrative && (
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
            {hasJourney && !inBlocks('treatment-steps-block') && <TreatmentStepsList steps={svc.treatmentSteps} />}

            {/* Key Benefits */}
            {svc.benefits?.length > 0 && !inBlocks('benefits-block') && <BenefitsGrid benefits={svc.benefits} />}

            {/* Before / After — interactive gallery with filter + navigation */}
            {hasBeforeAfter && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-2xl font-headline font-bold text-[#0B2560]">Real Patient Results</h2>
                  <span className="text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border hidden sm:block">Unretouched photos</span>
                </div>
                <BeforeAfterGallery pairs={beforeAfterPairs} serviceName={svc.name} />
              </div>
            )}

            {/* Documented Results — full Result entries (Admin → Results) tagged to this service */}
            {documentedResults.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-2xl font-headline font-bold text-[#0B2560]">Documented Patient Results</h2>
                  <Link href="/results" className="text-sm font-semibold text-[#0B2560] hover:text-[#3b82f6] transition flex items-center gap-1.5">
                    View all <ChevronRight size={14} />
                  </Link>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  {documentedResults.map((r: any) => (
                    r.slug ? (
                      <Link key={String(r._id)} href={`/results/${r.slug}`} className="block">
                        <SliderCard pair={r} />
                      </Link>
                    ) : <SliderCard key={String(r._id)} pair={r} />
                  ))}
                </div>
              </div>
            )}

            {/* Recovery Timeline */}
            {hasRecovery && !inBlocks('recovery-timeline-block') && <RecoveryTimeline recoveryTime={svc.recoveryTime} stages={svc.recoveryStages} />}

            {/* Aftercare Calendar */}
            {svc.aftercareVisible && svc.aftercareGuidance?.length > 0 && (
              <AftercareCalendar items={svc.aftercareGuidance} serviceName={svc.name} />
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

            {/* Interactive Journey Explorer */}
            {svc.journeyExplorerVisible && svc.journeyExplorer?.length > 0 && !inBlocks('journey-explorer-block') && (
              <TreatmentJourneyExplorer stages={svc.journeyExplorer} serviceName={svc.name} />
            )}

            {/* Multi-Session Plan — generic fallback only. When the admin has
                authored a more specific journey (step-by-step above, or the
                Interactive Explorer), showing this too just repeated the same
                "what happens over time" question a third time. */}
            {!hasJourney && !(svc.journeyExplorerVisible && svc.journeyExplorer?.length > 0) && !inBlocks('journey-block') && (
              <TreatmentJourney
                sessions={svc.sessionsCount || 6}
                treatmentName={svc.name}
                phases={svc.journeyPhases}
              />
            )}

            {/* AI Treatment Journey Simulator */}
            <AiJourneySimulator serviceId={String(svc._id)} serviceName={svc.name} />

            {/* Treatment Comparison */}
            {svc.comparisonVisible && related.length > 0 && !inBlocks('comparison-block') && (
              <TreatmentComparison
                current={{ _id: String(svc._id), name: svc.name, price: svc.price, duration: svc.duration, sessionsRequired: svc.sessionsRequired, recoveryTime: svc.recoveryTime, painLevel: svc.painLevel, idealFor: svc.idealFor }}
                alternatives={related.slice(0, 2).map((r: any) => ({ _id: String(r._id), name: r.name, price: r.price, duration: r.duration, sessionsRequired: r.sessionsRequired, recoveryTime: r.recoveryTime, painLevel: r.painLevel, idealFor: r.idealFor }))}
                showPrice={siteConfig.showPriceOnCards}
              />
            )}

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
            {hasFAQ && !inBlocks('faq-block') && <FaqAccordion faq={svc.faq} />}

            {/* Why DR Youth */}
            <div className="bg-gradient-to-br from-[#f6faff] to-white rounded-3xl p-7 border border-blue-50">
              <h2 className="text-xl font-headline font-bold text-[#0B2560] mb-5">Why Choose DR Youth Clinic?</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {(svc.whyChooseUs?.length ? svc.whyChooseUs : DEFAULT_WHY_US).map((point: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-gray-50 shadow-sm">
                    <CheckCircle size={15} className="text-[#3B82C4] mt-0.5 shrink-0" />
                    <p className="text-gray-700 text-sm leading-relaxed">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            {layoutEngineMain && layoutEngineMain.length > 0 && (
              <div className="space-y-8">{layoutEngineMain}</div>
            )}

          </div>

          {/* ── STICKY SIDEBAR ── */}
          {layoutEngineSidebar ? (
            <aside className="lg:col-span-1">
              <div className="space-y-4">{layoutEngineSidebar}</div>
            </aside>
          ) : (
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
                    // EMI teaser sits right under the price so financing is
                    // visible at the very first glance, not only for a
                    // patient who scrolls all the way to the calculator
                    // further down — the lowest per-month figure (24
                    // months) is the number that actually changes minds on
                    // an expensive treatment.
                    siteConfig.showPriceOnCards && {
                      label: 'Starting Price', value: `₹${svc.price.toLocaleString('en-IN')}`, bold: true,
                      sub: svc.price > 3000 ? `or from ₹${Math.round(svc.price / 24).toLocaleString('en-IN')}/month` : undefined,
                    },
                    { label: 'Duration', value: `${svc.duration} min` },
                    svc.sessionsRequired && { label: 'Sessions', value: svc.sessionsRequired },
                    svc.recoveryTime && { label: 'Recovery', value: svc.recoveryTime, color: 'text-[#3B82C4]' },
                  ].filter(Boolean).map((row: any, i, arr) => (
                    <div key={i} className={`flex justify-between items-center py-2.5 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <span className="text-xs text-gray-500">{row.label}</span>
                      <span className="text-right">
                        <span className={`block font-semibold text-sm ${row.bold ? 'text-2xl font-extrabold text-[#0B2560]' : row.color ?? 'text-gray-700'}`}>{row.value}</span>
                        {row.sub && <span className="block text-[11px] font-semibold text-[#F5A623]">{row.sub}</span>}
                      </span>
                    </div>
                  ))}
                  <div className="pt-4 space-y-2.5">
                    <Link href="/book" className="block">
                      <button className="w-full bg-[#0B2560] text-white py-3.5 rounded-2xl font-bold text-sm shadow-[0_8px_24px_rgba(11,37,96,0.25)] hover:-translate-y-0.5 transition flex items-center justify-center gap-2">
                        <Calendar size={14} /> {siteConfig.consultationCta}
                      </button>
                    </Link>
                    <a href={`tel:${loc.phone}`} className="flex items-center justify-center gap-2 border-2 border-gray-100 text-[#0B2560] py-3 rounded-2xl font-semibold text-sm hover:bg-[#f6faff] transition">
                      <Phone size={13} /> Call to Book
                    </a>
                    <p className="text-center text-xs text-gray-500 pt-1">{siteConfig.consultationSub}</p>
                  </div>
                </div>
              </div>

              {/* Clinic info */}
              <div className="rounded-3xl border border-gray-100 p-5 bg-[#f6faff] space-y-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.18em]">Our {cityName} Clinic</p>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin size={13} className="text-[#3B82C4] mt-0.5 shrink-0" />
                  <span className="text-xs">{loc.address}</span>
                </div>
                {loc.hours?.[0] && (
                  <div className="flex items-start gap-2 text-gray-500">
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
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.18em]">Also available at</p>
                  {otherLocations.map((o: any) => (
                    <Link key={o.location} href={`/${o.location}/services/${catSlug}/${o.urlSlug}`} className="flex items-center justify-between hover:bg-[#f6faff] rounded-xl p-2 -mx-2 transition group">
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

              {/* Cost Estimator + EMI Calculator — gated on this service
                  actually having a real price, not on showPriceOnCards.
                  That setting's own description ("Control what visitors see
                  on service cards") scopes it to the browsing-stage grid
                  cards; a patient already reading a detail page in depth
                  benefits from seeing financing options regardless of
                  whether prices show on the cards they scrolled past to
                  get here — those are two different moments in the
                  decision, and conflating them under one flag was hiding
                  this from every patient whenever an admin turned prices
                  off on cards for an unrelated reason. */}
              {svc.price > 0 && (
                <>
                  {/* Cost Estimator */}
                  <CostEstimator
                    basePrice={svc.price}
                    sessionsRequired={svc.sessionsRequired}
                    serviceName={svc.name}
                  />

                  {/* EMI Calculator */}
                  <EMICalculator price={svc.price} />
                </>
              )}
            </div>
          </aside>
          )}
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
                    <div className="w-16 h-16 shrink-0">
                      {doc.photo?.url ? (
                        <FocalImage image={doc.photo} aspectRatio="1/1" sizes="64px" alt={doc.name} className="rounded-2xl" />
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
                        <p className="text-gray-500 text-xs mt-1">{doc.experience}+ years experience</p>
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
          <RelatedServicesPager
            related={related.map((r: any) => ({ ...r, effectiveSlug: getEffectiveSlug(r, params.location.toLowerCase()) }))}
            pageSize={siteConfig.relatedServicesCount}
            catLabel={catLabel}
            cityName={cityName}
            location={params.location}
            catSlug={catSlug}
            showPriceOnCards={siteConfig.showPriceOnCards}
          />
        )}

        {/* ── BOTTOM CTA ── */}
        <section id="bottom-cta" className="bg-gradient-to-br from-[#0B2560] to-[#1a4a8a] py-16 text-white text-center relative overflow-hidden">
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
              Book a {siteConfig.consultationFree ? 'free ' : ''}consultation with our {cityName} specialists and receive a personalised treatment plan.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/book">
                <button className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-7 py-3.5 rounded-2xl font-bold shadow-lg hover:-translate-y-0.5 transition text-sm">
                  <Calendar size={15} /> {siteConfig.consultationCta}
                </button>
              </Link>
              <a href={`tel:${loc.phone}`} className="inline-flex items-center gap-2 border-2 border-white/20 text-white px-7 py-3.5 rounded-2xl font-semibold hover:bg-white/10 transition text-sm">
                <Phone size={15} /> {loc.phone}
              </a>
            </div>
            <p className="text-white/25 text-xs mt-5">{siteConfig.consultationSub} · Personalised plan</p>
          </div>
        </section>

      </main>

      <ServiceStickyDesktopCta ctaText={siteConfig.consultationCta} phone={loc.phone} />
    </>
  );
}
