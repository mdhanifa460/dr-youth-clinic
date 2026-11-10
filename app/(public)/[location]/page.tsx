import Link from 'next/link';
import Image from 'next/image';
import {
  BadgeCheck, MapPin, Clock, Phone, ChevronRight, Stethoscope,
  FlaskConical, ShieldCheck, UserCheck, Camera,
} from 'lucide-react';
import { locations } from '@/app/data/locations';
import { LocalBusinessSchema } from '@/app/components/SchemaMarkup';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cleanCredentialWording, scrubClaims } from '@/app/lib/patientClaims';
import { toTelHref } from '@/app/lib/phone';
import { connectDB } from '@/app/lib/mongodb';
import { LocationContent } from '@/app/models/LocationContent';
import { Result, PUBLISHED_RESULT } from '@/app/models/Result';
import { Doctor } from '@/app/models/Doctor';
import { Service } from '@/app/models/Service';
import { getCachedCategories } from '@/app/lib/getCachedCategories';
import { getEffectiveSlug } from '@/app/lib/serviceSeo';
import BeforeAfterSection from '@/app/components/homepage/BeforeAfterSection';
import SliderCard from '@/app/components/SliderCard';
import { cloudHero } from '@/app/lib/cloudinary-url';
import FocalImage from '@/app/components/media/FocalImage';
import { resolveBanner, resolveSpotlight } from '@/app/lib/banners/resolveBanner';
import CampaignSpotlight from '@/app/components/homepage/CampaignSpotlight';
import BannerCarousel from '@/app/components/banners/BannerCarousel';
import BannerRenderer from '@/app/components/banners/BannerRenderer';
import HomepageOfferSplash from '@/app/components/banners/HomepageOfferSplash';
import { getSiteConfig } from '@/app/lib/siteConfig';
import { getSettings } from '@/app/models/Settings';
import { renderZoneSections } from '@/app/components/layoutEngine/renderZoneSections';
import { pseudoPageId } from '@/app/lib/layoutEngine/pseudoPageId';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

export const revalidate = 300;

export function generateStaticParams() {
  return Object.keys(locations).map((location) => ({ location }));
}

export async function generateMetadata(props: { params: Promise<{ location: string }> }): Promise<Metadata> {
  const params = await props.params;
  const loc = locations[params.location];
  if (!loc) return {};
  const { name } = loc;
  return {
    title: `Skin, Hair & Aesthetic Clinic in ${name}`,
    description: `Skin, hair and laser treatments at DR Youth Clinic in ${name}. Book your consultation today. ${loc.specialties.join(', ')}.`,
    alternates: { canonical: `${SITE_URL}/${params.location}` },
    openGraph: {
      title: `Skin Clinic in ${name} | DR Youth Clinic`,
      description: `Skin and hair care — ${loc.specialties.slice(0, 3).join(', ')} — at our ${name} clinic.`,
      url: `${SITE_URL}/${params.location}`,
      siteName: 'DR Youth Clinic',
      type: 'website',
      locale: 'en_IN',
    },
  };
}

async function getBranchResults(city: string) {
  try {
    await connectDB();
    const docs = await (Result as any)
      .find({ branch: { $in: [city, 'all'] }, ...PUBLISHED_RESULT })
      .sort({ order: 1, createdAt: -1 })
      .limit(3)
      .lean();
    return JSON.parse(JSON.stringify(docs));
  } catch { return []; }
}

// Doctors an admin has assigned to this branch (or to every branch), as on the
// treatment pages. Only real Admin → Doctors records; nothing is filled in.
async function getBranchDoctors(city: string) {
  try {
    await connectDB();
    const docs = await (Doctor as any)
      .find({ locations: { $in: [city, 'all'] }, active: true })
      .select('name title qualifications photo')
      .sort({ order: 1 })
      .limit(8)
      .lean();
    return JSON.parse(JSON.stringify(docs)) as { _id: string; name: string; title: string; qualifications?: string; photo?: { url?: string } }[];
  } catch { return []; }
}

// Every active treatment offered at this branch, grouped by category, each linking
// to its own city treatment page. Same availability rule as the homepage menu.
async function getBranchTreatments(city: string) {
  try {
    await connectDB();
    const [svcs, categories] = await Promise.all([
      (Service as any).find({
        status: 'active',
        $or: [{ targetLocations: city }, { targetLocations: { $exists: false }, location: { $in: [city, 'all'] } }],
      }).select('name category urlSlug locationSeo targetLocations location').sort({ name: 1 }).limit(200).lean(),
      getCachedCategories(),
    ]);
    const groups = (categories as any[]).map((c) => ({ slug: c.slug as string, label: (c.label || c.name || c.slug) as string, dbKey: c.dbKey as string, items: [] as { name: string; href: string }[] }));
    for (const sv of svcs as any[]) {
      const group = groups.find((g) => g.dbKey === sv.category);
      const slug = getEffectiveSlug(sv, city);
      if (!group || !slug || !sv.name) continue;
      group.items.push({ name: sv.name, href: `/${city}/services/${group.slug}/${slug}` });
    }
    return groups.filter((g) => g.items.length > 0).map(({ slug, label, items }) => ({ slug, label, items }));
  } catch { return []; }
}

async function getLocationContent(city: string) {
  try {
    await connectDB();
    const doc = await LocationContent.findOne({ location: city }).lean() as any;
    if (!doc) return null;
    return {
      heroImage:        doc.heroImage,
      googleMapsUrl:    doc.googleMapsUrl || '',
      mapEmbedUrl:      doc.mapEmbedUrl   || '',
      clinicInfo:       doc.clinicInfo    || null,
      beforeAfterPairs: doc.beforeAfterPairs.filter((p: any) => p.isVisible),
      galleryImages:    doc.galleryImages
        .filter((g: any) => g.isVisible)
        .sort((a: any, b: any) => a.displayOrder - b.displayOrder),
      layoutEngineEnabled: !!doc.layoutEngineEnabled,
    };
  } catch {
    return null;
  }
}

const WHY_US = [
  {
    icon: 'flask',
    title: 'Evidence-Based Protocols',
    desc: 'Treatment options are discussed with reference to current clinical practice.',
  },
  {
    icon: 'shield',
    title: 'Doctor-Selected Technology',
    desc: 'Our doctors choose the medical aesthetic devices used for each treatment.',
  },
  {
    icon: 'user',
    title: 'Personalised Care Path',
    desc: 'No two patients alike — we curate a bespoke treatment journey for your specific goals.',
  },
];

// Maps the admin-editable "icon" key (a plain string, since it's stored in MongoDB)
// to the actual lucide-react component used to render each Why-Us card.
const WHY_US_ICON_MAP: Record<string, typeof FlaskConical> = {
  flask: FlaskConical,
  shield: ShieldCheck,
  user: UserCheck,
  stethoscope: Stethoscope,
  badge: BadgeCheck,
};

export default async function LocationPage(props: { params: Promise<{ location: string }> }) {
  const params = await props.params;
  const cityKey = params.location;
  const loc = locations[cityKey];
  if (!loc) notFound();

  const [content, locationBanners, branchResults, siteConfig, settings, spotlight, branchDoctors, branchTreatments] = await Promise.all([
    getLocationContent(cityKey),
    resolveBanner({ page: 'location', location: cityKey }),
    getBranchResults(cityKey),
    getSiteConfig(),
    getSettings(),
    resolveSpotlight({ page: 'location', location: cityKey }),
    getBranchDoctors(cityKey),
    getBranchTreatments(cityKey),
  ]);
  // Flash Offer Popup — see app/(public)/page.tsx's own comment for the
  // exact same splashBanner/carouselBanners split (this page previously
  // never mounted the popup at all, only the plain inline carousel).
  const splashBanner = locationBanners.find((b: any) => b.splashEnabled) || null;
  const carouselBanners = splashBanner && splashBanner.splashAlsoInRotation === false
    ? locationBanners.filter((b: any) => String(b._id) !== String(splashBanner._id))
    : locationBanners;

  const otherCities = Object.entries(locations).filter(([k]) => k !== cityKey);
  const hasHero    = !!(content?.heroImage?.url);
  const hasPairs   = (content?.beforeAfterPairs?.length ?? 0) > 0;
  const hasGallery = (content?.galleryImages?.length ?? 0)    > 0;

  // DB clinicInfo takes priority over static locations.ts data
  const ci          = content?.clinicInfo;
  const address     = ci?.address     || loc.address;
  const phone       = ci?.phone       || loc.phone;
  const telHref     = toTelHref(phone);
  const hours       = ci?.hours?.length ? ci.hours : loc.hours;
  const description = cleanCredentialWording(ci?.description || loc.description);
  const specialties = ci?.specialties?.length ? ci.specialties : loc.specialties;
  const whyUs       = ci?.whyUs?.length ? scrubClaims(JSON.parse(JSON.stringify(ci.whyUs))) as typeof WHY_US : WHY_US;
  const mapEmbedUrl = content?.mapEmbedUrl   || loc.map;
  const directionsUrl = content?.googleMapsUrl ||
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

  // Content Layout Engine — additive main-zone sections, opt-in per city via
  // LocationContent.layoutEngineEnabled. Location pages have no per-city
  // Mongo document with a real _id (locations.ts is static data), so a
  // deterministic pseudo-ObjectId derived from the city key stands in.
  const layoutEngineMain = content?.layoutEngineEnabled
    ? await renderZoneSections({
        pageType: 'location',
        pageId: pseudoPageId(cityKey),
        context: { page: { name: loc.name } },
        zone: 'main',
      })
    : null;

  return (
    <>
      <LocalBusinessSchema
        location={cityKey}
        city={loc.name}
        address={address}
        phone={phone}
        hours={hours}
        schemaType={siteConfig.schemaType}
        imageUrl={content?.heroImage?.url}
        mapEmbedUrl={mapEmbedUrl}
      />
      <HomepageOfferSplash banner={splashBanner} page="location" />
      {/* Festival or branch offer for this city (Admin → Banners → Campaign Spotlight) */}
      {spotlight && <CampaignSpotlight banner={spotlight} />}
      <div>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        {/* Matching Banner(s) (admin-configured) take over this slot when
            any exist — as a carousel when there's more than one; otherwise
            the original hardcoded hero below renders unchanged, including
            its mobile-spacing fix (py-8 md:py-24 etc. trims enough vertical
            rhythm that the CTA row clears the fixed mobile WhatsApp/Call/
            Book bar). */}
        {carouselBanners.length > 0 ? (
          <BannerCarousel slides={carouselBanners.map((b: any) => <BannerRenderer key={String(b._id)} banner={b} />)} intervalMs={settings.display?.carouselIntervalMs ?? 6000} />
        ) : (
        <section id="home" className="py-8 md:py-24 px-6 md:px-10 bg-background">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-14 items-start">

            {/* LEFT — headline + CTAs */}
            <div className="space-y-4 md:space-y-7 pt-4">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-tertiary text-primary text-sm font-semibold">
                <BadgeCheck size={15} />
                DR Youth Clinic — {loc.name}
              </span>

              <h1 className="heading-display">
                Advanced Skin &amp; Aesthetic Care{' '}
                <br />
                <span className="text-bronze">in {loc.name}</span>
              </h1>

              <p className="text-text-secondary text-base md:text-lg leading-relaxed max-w-lg">
                {description}
              </p>

              <div className="flex flex-wrap gap-4">
                <Link href={`/book?location=${cityKey}`} className="inline-flex items-center justify-center bg-primary text-white px-8 py-3.5 rounded-xl font-semibold shadow-[0_8px_24px_rgba(0,32,69,0.2)] hover:-translate-y-0.5 transition">
                    Book Consultation
                  </Link>
                {telHref && (
                  <a href={telHref} className="inline-flex items-center gap-2 border border-primary text-primary px-8 py-3.5 rounded-xl font-semibold hover:bg-primary/5 transition">
                    <Phone size={15} /> Call Clinic
                  </a>
                )}
              </div>

              <div className="flex flex-wrap gap-6 pt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <BadgeCheck size={14} className="text-secondary" /> 9+ Years Experience
                </span>
                {content?.googleMapsUrl && (
                  <a href={content.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:underline">
                    <BadgeCheck size={14} className="text-secondary" /> Read our reviews on Google
                  </a>
                )}
              </div>
            </div>

            {/* RIGHT — clinic info card with optional hero photo */}
            <div id="contact" className="bg-white rounded-3xl shadow-[0_12px_48px_rgba(0,32,69,0.1)] overflow-hidden">
              {/* City hero image if available */}
              {hasHero && (
                <div className="relative h-44 w-full">
                  <Image
                    src={cloudHero(content!.heroImage.publicId) || content!.heroImage.url}
                    alt={`DR Youth Clinic ${loc.name}`}
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <span className="absolute bottom-3 left-4 text-white text-xs font-bold bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
                    DR Youth Clinic · {loc.name}
                  </span>
                </div>
              )}

              <div className="p-8 space-y-5">
                <h2 className="text-xl font-headline font-extrabold text-primary">
                  DR Youth Clinic — {loc.name}
                </h2>

                <div className="flex gap-3 text-gray-700 text-sm">
                  <MapPin className="text-secondary shrink-0 mt-0.5" size={17} />
                  <span>{address}</span>
                </div>

                {telHref && (
                  <a href={telHref} className="flex gap-3 text-gray-700 text-sm hover:text-primary transition">
                    <Phone className="text-secondary shrink-0 mt-0.5" size={17} />
                    {phone}
                  </a>
                )}

                <div className="border-t border-gray-100 pt-4 space-y-2.5">
                  {hours.map((h, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <Clock className="text-secondary shrink-0 mt-0.5" size={15} />
                      <span>
                        <span className="font-semibold text-primary">{h.day}:</span>{' '}
                        <span className="text-gray-600">{h.hours}</span>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl overflow-hidden border border-gray-100 h-[180px]">
                  <iframe
                    src={mapEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`DR Youth Clinic ${loc.name} location map`}
                    allowFullScreen
                  />
                </div>

                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-opacity-90 transition"
                >
                  <MapPin size={15} /> Get Directions
                </a>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* ── SPECIALTIES ──────────────────────────────────────────────────── */}
        <section id="services" className="py-20 px-6 md:px-10 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="mb-10">
              <p className="text-secondary font-bold text-xs tracking-[0.2em] uppercase mb-3">
                Specialised Treatments
              </p>
              <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-primary">
                Our Services in {loc.name}
              </h2>
              <p className="text-gray-600 mt-3 max-w-xl">
                Explore the treatments our {loc.name} clinic specialises in, planned with our doctors.
              </p>
            </div>

            {branchTreatments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {branchTreatments.map((group) => (
                  <div key={group.slug} className="min-w-0 bg-background rounded-2xl p-5">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h3 className="font-headline font-extrabold text-primary capitalize">{group.label}</h3>
                      <Link href={`/${cityKey}/services/${group.slug}`} className="text-xs font-semibold text-secondary hover:underline shrink-0">
                        View all
                      </Link>
                    </div>
                    <ul className="space-y-1">
                      {group.items.slice(0, 8).map((item) => (
                        <li key={item.href}>
                          <Link href={item.href} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 -mx-2 text-sm font-medium text-gray-700 hover:bg-white hover:text-primary transition">
                            <span className="min-w-0 [overflow-wrap:anywhere]">{item.name}</span>
                            <ChevronRight size={14} className="text-gray-400 shrink-0" aria-hidden />
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {group.items.length > 8 && (
                      <Link href={`/${cityKey}/services/${group.slug}`} className="inline-block mt-2 text-xs font-semibold text-secondary hover:underline">
                        +{group.items.length - 8} more {group.label.toLowerCase()} treatments
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {specialties.map((sp, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-background rounded-2xl px-5 py-4 group hover:bg-primary hover:shadow-[0_8px_28px_rgba(0,32,69,0.15)] transition-all duration-200 cursor-default"
                >
                  <div className="w-8 h-8 rounded-full bg-secondary/15 group-hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors duration-200">
                    <Stethoscope className="text-secondary group-hover:text-white transition-colors duration-200" size={15} />
                  </div>
                  <span className="font-semibold text-primary text-sm group-hover:text-white transition-colors duration-200">
                    {sp}
                  </span>
                </div>
              ))}
            </div>
            )}

            <div className="mt-10 text-center">
              <Link
                href={`/book?location=${cityKey}`}
                className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3.5 rounded-xl font-semibold shadow-[0_8px_24px_rgba(0,32,69,0.2)] hover:-translate-y-0.5 transition"
              >
                Book at {loc.name} <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── DOCTORS AT THIS BRANCH (Admin → Doctors, assigned to this city) ── */}
        {branchDoctors.length > 0 && (
          <section className="py-16 px-6 md:px-10 bg-canvas">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <p className="text-secondary font-bold text-xs tracking-[0.2em] uppercase mb-3">Your Care Team</p>
                <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-primary">Doctors at {loc.name}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {branchDoctors.map((doc) => (
                  <Link
                    key={doc._id}
                    href={`/doctors/${doc._id}`}
                    className="min-w-0 flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-[0_8px_28px_rgba(0,32,69,0.1)] transition"
                  >
                    {doc.photo?.url ? (
                      <img src={doc.photo.url} alt={doc.name} width={64} height={64} loading="lazy" decoding="async" className="w-16 h-16 rounded-full object-cover shrink-0" />
                    ) : (
                      <span className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0" aria-hidden>
                        <Stethoscope size={22} />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block font-bold text-primary leading-snug [overflow-wrap:anywhere]">{doc.name}</span>
                      <span className="block text-xs text-gray-500 mt-0.5 line-clamp-2">{doc.qualifications?.trim() || doc.title}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── BEFORE / AFTER RESULTS (location-specific) ───────────────────── */}
        {hasPairs && (
          <BeforeAfterSection
            data={{
              headline: `Treatment Photos from Our ${loc.name} Clinic`,
              subheadline: `Patient transformations achieved at DR Youth Clinic ${loc.name}.`,
              pairs: content!.beforeAfterPairs.map((p) => ({
                title: p.title,
                description: p.description || '',
                before: p.before,
                after: p.after,
              })),
            }}
          />
        )}

        {/* ── DOCUMENTED RESULTS from Admin → Results, filtered to this branch ── */}
        {siteConfig.showBeforeAfterOnPublic && branchResults.length > 0 && (
          <section className="py-16 px-6 md:px-10 bg-canvas">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
                <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-primary">
                  Patient Results at {loc.name}
                </h2>
                <Link href="/results" className="text-sm font-semibold text-primary hover:text-[#3b82f6] transition flex items-center gap-1.5">
                  View all <ChevronRight size={14} />
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {branchResults.map((r: any) => (
                  r.slug ? (
                    <Link key={String(r._id)} href={`/results/${r.slug}`} className="block">
                      <SliderCard pair={r} />
                    </Link>
                  ) : <SliderCard key={String(r._id)} pair={r} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── CLINIC GALLERY ───────────────────────────────────────────────── */}
        {hasGallery && (
          <section className="py-20 px-6 md:px-10 bg-white">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
                <div>
                  <p className="text-secondary font-bold text-xs tracking-[0.2em] uppercase mb-3">
                    Inside Our Clinic
                  </p>
                  <h2 className="text-3xl font-headline font-extrabold text-primary">
                    {loc.name} Clinic Gallery
                  </h2>
                  <p className="text-gray-600 mt-2 text-sm">
                    State-of-the-art facilities and a welcoming environment for your care journey.
                  </p>
                </div>
                <Camera className="text-secondary shrink-0" size={28} />
              </div>

              <div className={`grid gap-4 ${
                content!.galleryImages.length === 1
                  ? 'max-w-lg'
                  : content!.galleryImages.length === 2
                  ? 'sm:grid-cols-2 max-w-2xl'
                  : 'sm:grid-cols-2 lg:grid-cols-3'
              }`}>
                {content!.galleryImages.map((img, i) => (
                  <FocalImage
                    key={i}
                    image={img}
                    aspectRatio="1/1"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    alt={img.caption || `${loc.name} clinic photo ${i + 1}`}
                    className="rounded-2xl shadow-sm group bg-gray-100"
                    imgClassName="group-hover:scale-105 transition-transform duration-500"
                  >
                    {img.caption && (
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                        <p className="text-white text-xs font-medium">{img.caption}</p>
                      </div>
                    )}
                  </FocalImage>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── WHY CHOOSE US ────────────────────────────────────────────────── */}
        <section className="py-20 px-6 md:px-10 bg-background">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-primary">
                Why Choose DR Youth Clinic?
              </h2>
              <p className="text-gray-600 mt-4 max-w-xl mx-auto">
                Consultation-led care, planned around you.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {whyUs.map(({ icon, title, desc }, i) => {
                const Icon = WHY_US_ICON_MAP[icon] || FlaskConical;
                return (
                  <div
                    key={i}
                    className="bg-white rounded-2xl p-8 shadow-[0_4px_24px_rgba(0,32,69,0.06)] hover:-translate-y-1 transition-transform duration-200"
                  >
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-5">
                      <Icon className="text-secondary" size={22} />
                    </div>
                    <h3 className="text-lg font-bold text-primary mb-2">{title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── OTHER LOCATIONS ───────────────────────────────────────────────── */}
        <section className="py-20 px-6 md:px-10 bg-white">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-headline font-extrabold text-primary mb-2">
              Visit Our Other Clinics
            </h2>
            <p className="text-gray-500 text-sm mb-8">
              DR Youth Clinic operates across multiple cities — find the one nearest to you.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {otherCities.map(([key, data]) => (
                <Link
                  key={key}
                  href={`/${key}`}
                  className="group bg-background rounded-2xl p-6 hover:bg-primary transition-colors duration-200"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="text-secondary group-hover:text-white shrink-0 transition-colors duration-200" size={15} />
                    <span className="font-bold text-primary group-hover:text-white transition-colors duration-200">
                      {data.name}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm group-hover:text-white/70 transition-colors duration-200 mb-3">
                    {data.address}
                  </p>
                  <p className="text-secondary group-hover:text-white/90 text-sm font-semibold transition-colors duration-200">
                    View Clinic →
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {layoutEngineMain && layoutEngineMain.length > 0 && (
          <div className="space-y-0">{layoutEngineMain}</div>
        )}

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="py-20 px-6 md:px-10">
          <div className="max-w-7xl mx-auto bg-primary rounded-[32px] p-12 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_120%,#fff,transparent_60%)]" />
            <div className="relative z-10 space-y-6">
              <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-white max-w-3xl mx-auto leading-tight">
                Ready to Transform Your Skin in {loc.name}?
              </h2>
              <p className="text-white/80 text-lg max-w-xl mx-auto">
                Book a consultation with our doctors.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                <Link href={`/book?location=${cityKey}`} className="inline-flex items-center justify-center bg-white text-primary px-10 py-4 rounded-xl font-bold text-lg shadow-xl hover:-translate-y-0.5 hover:shadow-2xl transition">
                    Book Consultation
                  </Link>
                <a
                  href={`tel:${phone}`}
                  className="flex items-center gap-2 justify-center text-white font-semibold text-lg hover:opacity-80 transition"
                >
                  <Phone size={18} />
                  Call Now
                </a>
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
