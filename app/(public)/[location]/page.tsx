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
import { connectDB } from '@/app/lib/mongodb';
import { LocationContent } from '@/app/models/LocationContent';
import BeforeAfterSection from '@/app/components/homepage/BeforeAfterSection';
import { cloudGalleryThumb, cloudHero } from '@/app/lib/cloudinary-url';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

export const revalidate = 300;

export function generateStaticParams() {
  return Object.keys(locations).map((location) => ({ location }));
}

export async function generateMetadata({ params }: { params: { location: string } }): Promise<Metadata> {
  const loc = locations[params.location];
  if (!loc) return {};
  const { name } = loc;
  return {
    title: `Best Dermatology & Skin Clinic in ${name} | DR Youth Clinic`,
    description: `Premium skin, hair & laser treatments in ${name}. Expert dermatologists at ${loc.address}. Book your consultation today. ${loc.specialties.join(', ')}.`,
    alternates: { canonical: `${SITE_URL}/${params.location}` },
    openGraph: {
      title: `Best Skin Clinic in ${name} | DR Youth Clinic`,
      description: `Advanced dermatology — ${loc.specialties.slice(0, 3).join(', ')} — at our ${name} clinic.`,
      url: `${SITE_URL}/${params.location}`,
      siteName: 'DR Youth Clinic',
      type: 'website',
      locale: 'en_IN',
    },
  };
}

async function getLocationContent(city: string) {
  try {
    await connectDB();
    const doc = await LocationContent.findOne({ location: city }).lean();
    if (!doc) return null;
    return {
      heroImage: doc.heroImage,
      beforeAfterPairs: doc.beforeAfterPairs.filter((p) => p.isVisible),
      galleryImages: doc.galleryImages
        .filter((g) => g.isVisible)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    };
  } catch {
    return null;
  }
}

const WHY_US = [
  {
    icon: FlaskConical,
    title: 'Evidence-Based Protocols',
    desc: 'Every treatment backed by clinical research and proven medical outcomes.',
  },
  {
    icon: ShieldCheck,
    title: 'FDA-Approved Technology',
    desc: 'We invest only in the safest, most advanced medical aesthetic devices available globally.',
  },
  {
    icon: UserCheck,
    title: 'Personalised Care Path',
    desc: 'No two patients alike — we curate a bespoke treatment journey for your specific goals.',
  },
];

export default async function LocationPage({ params }: { params: { location: string } }) {
  const cityKey = params.location;
  const loc = locations[cityKey];
  if (!loc) notFound();

  const [content] = await Promise.all([getLocationContent(cityKey)]);
  const otherCities = Object.entries(locations).filter(([k]) => k !== cityKey);
  const hasHero = !!(content?.heroImage?.url);
  const hasPairs = (content?.beforeAfterPairs?.length ?? 0) > 0;
  const hasGallery = (content?.galleryImages?.length ?? 0) > 0;

  return (
    <>
      <LocalBusinessSchema location={cityKey} city={loc.name} />
      <main>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="py-24 px-6 md:px-10 bg-background">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-14 items-start">

            {/* LEFT — headline + CTAs */}
            <div className="space-y-7 pt-4">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-tertiary text-primary text-sm font-semibold">
                <BadgeCheck size={15} />
                DR Youth Clinic — {loc.name}
              </span>

              <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-primary leading-tight">
                Advanced Skin &amp; Aesthetic Care
                <br />
                <span className="text-secondary">in {loc.name}</span>
              </h1>

              <p className="text-gray-700 text-lg leading-relaxed font-semibold max-w-lg">
                {loc.description}
              </p>

              <div className="flex flex-wrap gap-4">
                <Link href="/book">
                  <button className="bg-primary text-white px-8 py-3.5 rounded-xl font-semibold shadow-[0_8px_24px_rgba(0,32,69,0.2)] hover:-translate-y-0.5 transition">
                    Book Consultation
                  </button>
                </Link>
                <a href={`tel:${loc.phone}`}>
                  <button className="border border-primary text-primary px-8 py-3.5 rounded-xl font-semibold hover:bg-primary/5 transition">
                    <span className="flex items-center gap-2">
                      <Phone size={15} /> Call Clinic
                    </span>
                  </button>
                </a>
              </div>

              <div className="flex flex-wrap gap-6 pt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <BadgeCheck size={14} className="text-secondary" /> 25K+ Happy Patients
                </span>
                <span className="flex items-center gap-1.5">
                  <BadgeCheck size={14} className="text-secondary" /> 22+ Years Experience
                </span>
                <span className="flex items-center gap-1.5">
                  <BadgeCheck size={14} className="text-secondary" /> 4.7★ Rated on Google
                </span>
              </div>
            </div>

            {/* RIGHT — clinic info card with optional hero photo */}
            <div className="bg-white rounded-3xl shadow-[0_12px_48px_rgba(0,32,69,0.1)] overflow-hidden">
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
                <h2 className="text-xl font-headline font-bold text-primary">
                  DR Youth Clinic — {loc.name}
                </h2>

                <div className="flex gap-3 text-gray-700 text-sm">
                  <MapPin className="text-secondary shrink-0 mt-0.5" size={17} />
                  <span>{loc.address}</span>
                </div>

                <a href={`tel:${loc.phone}`} className="flex gap-3 text-gray-700 text-sm hover:text-primary transition">
                  <Phone className="text-secondary shrink-0 mt-0.5" size={17} />
                  {loc.phone}
                </a>

                <div className="border-t border-gray-100 pt-4 space-y-2.5">
                  {loc.hours.map((h, i) => (
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
                    src={loc.map}
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
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.address)}`}
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
                Explore the treatments our {loc.name} clinic specialises in, delivered by board-certified dermatologists.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {loc.specialties.map((sp, i) => (
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

            <div className="mt-10 text-center">
              <Link
                href="/book"
                className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3.5 rounded-xl font-semibold shadow-[0_8px_24px_rgba(0,32,69,0.2)] hover:-translate-y-0.5 transition"
              >
                Book at {loc.name} <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── BEFORE / AFTER RESULTS (location-specific) ───────────────────── */}
        {hasPairs && (
          <BeforeAfterSection
            data={{
              headline: `Real Results from Our ${loc.name} Clinic`,
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
                  <div key={i} className="rounded-2xl overflow-hidden shadow-sm group relative aspect-[4/3] bg-gray-100">
                    <Image
                      src={cloudGalleryThumb(img.publicId) || img.url}
                      alt={img.caption || `${loc.name} clinic photo ${i + 1}`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {img.caption && (
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                        <p className="text-white text-xs font-medium">{img.caption}</p>
                      </div>
                    )}
                  </div>
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
                World-class dermatology backed by evidence, technology, and genuinely personalised care.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {WHY_US.map(({ icon: Icon, title, desc }, i) => (
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
              ))}
            </div>
          </div>
        </section>

        {/* ── OTHER LOCATIONS ───────────────────────────────────────────────── */}
        <section className="py-20 px-6 md:px-10 bg-white">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-headline font-bold text-primary mb-2">
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

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="py-20 px-6 md:px-10">
          <div className="max-w-7xl mx-auto bg-primary rounded-[32px] p-12 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_120%,#fff,transparent_60%)]" />
            <div className="relative z-10 space-y-6">
              <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-white max-w-3xl mx-auto leading-tight">
                Ready to Transform Your Skin in {loc.name}?
              </h2>
              <p className="text-white/80 text-lg max-w-xl mx-auto">
                Book a consultation with our expert dermatologists today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                <Link href="/book">
                  <button className="bg-white text-primary px-10 py-4 rounded-xl font-bold text-lg shadow-xl hover:-translate-y-0.5 hover:shadow-2xl transition">
                    Book Consultation
                  </button>
                </Link>
                <a
                  href={`tel:${loc.phone}`}
                  className="flex items-center gap-2 justify-center text-white font-semibold text-lg hover:opacity-80 transition"
                >
                  <Phone size={18} />
                  {loc.phone}
                </a>
              </div>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
