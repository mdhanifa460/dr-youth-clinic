import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CheckCircle, Clock, IndianRupee, ChevronRight, Phone, Calendar, ArrowLeft } from 'lucide-react';
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { locations } from '@/app/data/locations';

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

// Canonical slug → DB category name
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
    },
  };
}

function ServiceSchema({ svc, cityName }: { svc: any; cityName: string }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'MedicalProcedure',
    name: svc.name,
    description: svc.metaDescription || svc.narrative?.slice(0, 160) || '',
    procedureType: 'https://schema.org/TherapeuticProcedure',
    status: 'https://schema.org/EventScheduled',
    bodyLocation: svc.category,
    followup: 'Consultation recommended',
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
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

const CATEGORY_ICON: Record<string, string> = {
  Skin: '✨',
  Hair: '🌿',
  Laser: '⚡',
  Other: '🏥',
};

export default async function ServiceDetailPage({ params }: PageProps) {
  const loc = locations[params.location];
  if (!loc) notFound();

  const catSlug = params.category.toLowerCase();

  // Validate category segment
  if (!CATEGORY_MAP[catSlug]) notFound();

  const svc = await getService(params.location, params.slug);
  if (!svc) notFound();

  // Guard: category in URL must match stored category
  if (svc.category.toLowerCase() !== catSlug) notFound();

  const related = await getRelatedServices(params.location, svc.category, params.slug);
  const cityName = loc.name;
  const catLabel = CATEGORY_LABEL[catSlug] ?? svc.category;
  const hasBeforeAfter = svc.beforeAfterImages?.some((p: any) => p.before?.url && p.after?.url);

  return (
    <>
      <ServiceSchema svc={svc} cityName={cityName} />

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
        <section className="relative bg-gradient-to-br from-[#0B2560] to-[#1a4a8a] text-white overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/[0.03] translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-white/[0.04] -translate-x-1/3 translate-y-1/3" />
          </div>

          <div className="max-w-7xl mx-auto px-6 md:px-10 pt-8 relative">
            <Link
              href={`/${params.location}/services/${catSlug}`}
              className="inline-flex items-center gap-2 text-white/50 hover:text-white/90 transition text-sm font-medium"
            >
              <ArrowLeft size={14} />
              {catLabel}
            </Link>
          </div>

          <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 grid md:grid-cols-2 gap-10 items-center relative">
            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-wider uppercase">
                {CATEGORY_ICON[svc.category] ?? '🏥'} {svc.category} Treatment
              </span>
              <h1 className="text-4xl md:text-5xl font-headline font-extrabold leading-tight tracking-tight">
                {svc.name}
              </h1>
              {svc.metaDescription && (
                <p className="text-white/70 text-[17px] leading-relaxed">{svc.metaDescription}</p>
              )}
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
              <div className="flex flex-wrap gap-6 pt-2">
                <div className="flex items-center gap-1.5 text-sm text-white/70">
                  <IndianRupee size={13} className="text-[#F5A623]" />
                  Starting from <strong className="text-white ml-1">₹{svc.price.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-white/70">
                  <Clock size={13} className="text-[#F5A623]" />
                  <strong className="text-white">{svc.duration} min</strong>&nbsp;session
                </div>
              </div>
            </div>

            {svc.heroImage?.url ? (
              <div className="relative h-72 md:h-[420px] rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src={svc.heroImage.url}
                  alt={svc.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              </div>
            ) : (
              <div className="h-72 md:h-[420px] rounded-2xl bg-white/10 flex items-center justify-center text-7xl">
                {CATEGORY_ICON[svc.category] ?? '🏥'}
              </div>
            )}
          </div>
        </section>

        {/* ── MAIN CONTENT ── */}
        <section className="max-w-7xl mx-auto px-6 md:px-10 py-16 grid lg:grid-cols-3 gap-12">

          {/* LEFT */}
          <div className="lg:col-span-2 space-y-14">

            {/* Narrative */}
            {svc.narrative && (
              <div>
                <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-5">
                  About This Treatment
                </h2>
                <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed whitespace-pre-line text-[15px]">
                  {svc.narrative}
                </div>
              </div>
            )}

            {/* Benefits */}
            {svc.benefits?.length > 0 && (
              <div>
                <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-6">
                  Key Benefits
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {svc.benefits.map((b: any, i: number) => (
                    <div key={i} className="flex gap-4 p-5 rounded-2xl bg-[#f6faff] border border-blue-50 hover:border-blue-100 transition">
                      <span className="text-2xl shrink-0 mt-0.5">{b.icon}</span>
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
                <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-6">
                  Real Results
                </h2>
                <div className="grid sm:grid-cols-2 gap-6">
                  {svc.beforeAfterImages
                    .filter((p: any) => p.before?.url && p.after?.url)
                    .map((pair: any, i: number) => (
                      <div key={i} className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                        <div className="grid grid-cols-2">
                          <div className="relative aspect-square">
                            <Image src={pair.before.url} alt="Before" fill sizes="200px" className="object-cover" />
                            <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded">BEFORE</span>
                          </div>
                          <div className="relative aspect-square">
                            <Image src={pair.after.url} alt="After" fill sizes="200px" className="object-cover" />
                            <span className="absolute bottom-2 left-2 bg-[#0B2560]/80 text-white text-[10px] font-bold px-2 py-0.5 rounded">AFTER</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">Results may vary. Consult a specialist for personalised advice.</p>
              </div>
            )}

            {/* Why DR Youth */}
            <div className="bg-[#f6faff] rounded-2xl p-8 border border-blue-50">
              <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-6">
                Why Choose DR Youth Clinic?
              </h2>
              <ul className="space-y-3.5">
                {[
                  'Expert dermatologists with 10+ years of clinical experience',
                  'FDA-approved technology and evidence-based protocols',
                  'Personalised treatment plans tailored to your skin biology',
                  'Transparent pricing with no hidden costs or upselling',
                  'Post-treatment care and dedicated follow-up support',
                ].map((point, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-700 text-sm">
                    <CheckCircle size={17} className="text-[#3B82C4] mt-0.5 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* RIGHT — sticky booking card */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
                <div className="bg-[#0B2560] px-6 py-5 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 mb-1">Book This Treatment</p>
                  <h3 className="text-xl font-headline font-bold leading-snug">{svc.name}</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-50">
                    <span className="text-sm text-gray-500">Starting Price</span>
                    <span className="text-2xl font-extrabold text-[#0B2560]">
                      ₹{svc.price.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-50">
                    <span className="text-sm text-gray-500">Session Duration</span>
                    <span className="font-semibold text-gray-800">{svc.duration} minutes</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-50">
                    <span className="text-sm text-gray-500">Location</span>
                    <span className="font-semibold text-gray-800 capitalize">{cityName}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-sm text-gray-500">Category</span>
                    <span className="font-semibold text-gray-800">{svc.category}</span>
                  </div>

                  <Link href="/book" className="block">
                    <button className="w-full bg-[#0B2560] text-white py-4 rounded-xl font-bold text-sm shadow-[0_8px_20px_rgba(11,37,96,0.25)] hover:-translate-y-0.5 transition flex items-center justify-center gap-2">
                      <Calendar size={15} />
                      Book Consultation
                    </button>
                  </Link>
                  <a href={`tel:${loc.phone}`} className="flex items-center justify-center gap-2 border border-gray-200 text-[#0B2560] py-3 rounded-xl font-semibold text-sm hover:bg-[#f6faff] transition">
                    <Phone size={14} /> Call to Book
                  </a>
                  <p className="text-center text-xs text-gray-400">Free first consultation · No commitment</p>
                </div>
              </div>

              {/* Clinic info */}
              <div className="rounded-2xl border border-gray-100 p-5 space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.18em] mb-3">Our {cityName} Clinic</p>
                <p className="text-sm text-gray-600 leading-relaxed">{loc.address}</p>
                {loc.hours?.[0] && (
                  <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-2">
                    <Clock size={12} className="text-[#3B82C4]" />
                    {loc.hours[0].day}: {loc.hours[0].hours}
                  </p>
                )}
              </div>
            </div>
          </aside>
        </section>

        {/* ── RELATED SERVICES ── */}
        {related.length > 0 && (
          <section className="bg-[#f6faff] py-14">
            <div className="max-w-7xl mx-auto px-6 md:px-10">
              <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
                <h2 className="text-2xl font-headline font-bold text-[#0B2560]">
                  More {svc.category} Treatments
                </h2>
                <Link
                  href={`/${params.location}/services/${catSlug}`}
                  className="text-sm font-semibold text-[#0B2560] hover:text-[#3b82f6] transition flex items-center gap-1.5"
                >
                  View all {catLabel} <ChevronRight size={15} />
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {related.map((r: any) => (
                  <Link
                    key={String(r._id)}
                    href={`/${r.location}/services/${r.category.toLowerCase()}/${r.urlSlug}`}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg border border-gray-100 transition-all hover:-translate-y-0.5"
                  >
                    {r.heroImage?.url && (
                      <div className="relative h-40 overflow-hidden">
                        <Image
                          src={r.heroImage.url}
                          alt={r.name}
                          fill
                          sizes="(max-width: 640px) 100vw, 33vw"
                          className="object-cover group-hover:scale-105 transition duration-300"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="font-bold text-[#0B2560] mb-1 group-hover:text-[#3B82C4] transition text-sm">{r.name}</h3>
                      <p className="text-sm text-gray-400 flex items-center justify-between mt-3">
                        <span className="font-semibold">₹{r.price.toLocaleString('en-IN')}</span>
                        <span>{r.duration} min</span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── BOTTOM CTA ── */}
        <section className="bg-[#0B2560] py-16 text-white text-center">
          <div className="max-w-2xl mx-auto px-6 space-y-4">
            <h2 className="text-3xl font-headline font-extrabold tracking-tight">Ready to Get Started?</h2>
            <p className="text-white/60">
              Book a consultation with our {cityName} specialists and take the first step towards your transformation.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Link href="/book">
                <button className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-8 py-4 rounded-xl font-bold shadow-lg hover:-translate-y-0.5 transition">
                  Book Appointment
                </button>
              </Link>
              <a href={`tel:${loc.phone}`} className="inline-flex items-center gap-2 border border-white/30 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition">
                Call {loc.phone}
              </a>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
