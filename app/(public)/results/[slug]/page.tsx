import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, ArrowLeft, Clock, Repeat, User, MapPin, Calendar } from 'lucide-react';
import { connectDB } from '@/app/lib/mongodb';
import { Result } from '@/app/models/Result';
import { Service } from '@/app/models/Service';
import { getSiteConfig } from '@/app/lib/siteConfig';
import { locations } from '@/app/data/locations';
import { getServiceCities, getEffectiveSlug } from '@/app/lib/serviceSeo';
import SliderCard from '@/app/components/SliderCard';
import { BreadcrumbSchema } from '@/app/components/SchemaMarkup';
import ArticleCtaBand from '@/app/(public)/blog/[slug]/ArticleCtaBand';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

async function getResult(slug: string) {
  try {
    await connectDB();
    const result = await (Result as any)
      .findOne({ slug, status: 'published' })
      .populate('service', 'name category urlSlug location targetLocations locationSeo')
      .populate('doctor', 'name title photo qualifications experience')
      .lean();
    if (!result) return null;
    return JSON.parse(JSON.stringify(result));
  } catch { return null; }
}

async function getRelatedResults(excludeId: string, category: string) {
  try {
    await connectDB();
    const query: any = { _id: { $ne: excludeId }, status: 'published' };
    if (category) query.category = category;
    let results = await (Result as any).find(query).sort({ order: 1, createdAt: -1 }).limit(3).lean();
    if (results.length < 3) {
      const more = await (Result as any)
        .find({ _id: { $ne: excludeId, $nin: results.map((r: any) => r._id) }, status: 'published' })
        .sort({ createdAt: -1 }).limit(3 - results.length).lean();
      results = [...results, ...more];
    }
    return JSON.parse(JSON.stringify(results));
  } catch { return []; }
}

async function getRelatedServices(serviceId: string | undefined, category: string) {
  try {
    await connectDB();
    const query: any = { status: 'active' };
    if (serviceId) query._id = { $ne: serviceId };
    if (category) query.category = { $regex: category.split(' ')[0], $options: 'i' };
    const services = await (Service as any).find(query).limit(3).lean();
    return JSON.parse(JSON.stringify(services));
  } catch { return []; }
}

export async function generateStaticParams() {
  try {
    await connectDB();
    const results = await (Result as any).find({ status: 'published' }).select('slug').lean();
    return results.filter((r: any) => r.slug).map((r: any) => ({ slug: r.slug }));
  } catch { return []; }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const result = await getResult(params.slug);
  if (!result) return { title: 'Result Not Found' };
  const title = result.seoTitle || `${result.title} — Before & After Results`;
  const description = result.seoDescription || result.description || `See real before and after results for ${result.title} at DR Youth Clinic.`;
  const ogImage = result.after?.url || result.before?.url || result.gallery?.[0]?.url;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/results/${params.slug}` },
    openGraph: {
      title,
      description,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : [],
      type: 'website',
      locale: 'en_IN',
    },
  };
}

function branchName(branch?: string) {
  if (!branch || branch === 'all') return null;
  return locations[branch]?.name ?? branch;
}

function serviceHref(svc: any) {
  if (!svc?.urlSlug || !svc?.category) return null;
  const cities = getServiceCities(svc);
  const city = cities[0];
  if (!city) return null;
  return `/${city}/services/${String(svc.category).toLowerCase()}/${getEffectiveSlug(svc, city)}`;
}

export default async function ResultDetailPage({ params }: { params: { slug: string } }) {
  const result = await getResult(params.slug);
  if (!result) notFound();

  const [related, relatedServices, siteConfig] = await Promise.all([
    getRelatedResults(result._id, result.category),
    getRelatedServices(result.service?._id, result.category),
    getSiteConfig(),
  ]);

  const hasComparison = !!(result.before?.url && result.after?.url);
  const galleryImages = [
    ...(result.beforeImages || []),
    ...(result.afterImages || []),
    ...(result.gallery || []),
  ];
  const branch = branchName(result.branch);
  const svcHref = serviceHref(result.service);

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Results', url: `${SITE_URL}/results` },
          { name: result.title, url: `${SITE_URL}/results/${result.slug}` },
        ]}
      />

      <main className="bg-white">
        {/* ── BREADCRUMB ── */}
        <nav className="bg-[#f6faff] border-b border-gray-100 py-3">
          <div className="max-w-6xl mx-auto px-6 flex items-center gap-1.5 text-sm text-gray-400 flex-wrap">
            <Link href="/" className="hover:text-[#0B2560] transition">Home</Link>
            <ChevronRight size={13} />
            <Link href="/results" className="hover:text-[#0B2560] transition">Results</Link>
            <ChevronRight size={13} />
            <span className="text-[#0B2560] font-semibold truncate max-w-[220px]">{result.title}</span>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="relative bg-gradient-to-br from-[#0B2560] via-[#102d6e] to-[#1a4a8a] text-white overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 pt-6">
            <Link href="/results" className="inline-flex items-center gap-2 text-white/50 hover:text-white/90 transition text-sm">
              <ArrowLeft size={14} /> All Results
            </Link>
          </div>
          <div className="max-w-6xl mx-auto px-6 py-10">
            {result.category && (
              <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-wider uppercase border border-white/10 mb-4">
                {result.category}
              </span>
            )}
            <h1 className="text-3xl md:text-5xl font-headline font-extrabold leading-tight tracking-tight mb-3">
              {result.title}
            </h1>
            {result.description && (
              <p className="text-white/70 text-base md:text-lg max-w-2xl leading-relaxed mb-6">{result.description}</p>
            )}

            <div className="flex flex-wrap gap-2 text-sm">
              {result.doctor?.name && (
                <span className="flex items-center gap-1.5 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full text-xs">
                  <User size={12} className="text-[#F5A623]" /> Dr. {result.doctor.name}
                </span>
              )}
              {branch && (
                <span className="flex items-center gap-1.5 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full text-xs">
                  <MapPin size={12} className="text-[#F5A623]" /> {branch} Clinic
                </span>
              )}
              {result.duration && (
                <span className="flex items-center gap-1.5 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full text-xs">
                  <Clock size={12} className="text-[#F5A623]" /> {result.duration}
                </span>
              )}
              {result.sessions && (
                <span className="flex items-center gap-1.5 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full text-xs">
                  <Repeat size={12} className="text-[#F5A623]" /> {result.sessions}
                </span>
              )}
              {result.patientAge && (
                <span className="flex items-center gap-1.5 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full text-xs">
                  Patient age: {result.patientAge}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── MAIN CONTENT ── */}
        <section className="max-w-6xl mx-auto px-6 py-14 grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">

            {/* Before/After comparison slider — reuses the same SliderCard as the /results listing */}
            {hasComparison && (
              <div>
                <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-5">Before &amp; After</h2>
                <div className="max-w-xl">
                  <SliderCard pair={result} />
                </div>
              </div>
            )}

            {/* Gallery */}
            {galleryImages.length > 0 && (
              <div>
                <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-5">Gallery</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {galleryImages.map((img: any, i: number) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-100">
                      <Image src={img.url} alt={`${result.title} photo ${i + 1}`} fill sizes="300px" className="object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video */}
            {result.video?.url && (
              <div>
                <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-5">Video</h2>
                <video src={result.video.url} controls className="w-full rounded-2xl border border-gray-100" />
              </div>
            )}

            {/* Related Services */}
            {relatedServices.length > 0 && (
              <div>
                <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-5">Related Services</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {relatedServices.map((s: any) => {
                    const href = serviceHref(s);
                    if (!href) return null;
                    return (
                      <Link key={String(s._id)} href={href}
                        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
                        <h3 className="font-bold text-[#0B2560] text-sm">{s.name}</h3>
                        <p className="text-[#3B82C4] text-xs mt-1 flex items-center gap-1">
                          View treatment <ChevronRight size={11} />
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── STICKY SIDEBAR ── */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                <div className="bg-[#0B2560] px-6 py-5 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-1">Interested in this result?</p>
                  <h3 className="text-base font-headline font-bold leading-snug">{result.title}</h3>
                </div>
                <div className="p-5 space-y-3">
                  {result.doctor?.name && (
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-50">
                      {result.doctor.photo?.url ? (
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0">
                          <Image src={result.doctor.photo.url} alt={result.doctor.name} fill sizes="44px" className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-[#0B2560]/10 flex items-center justify-center text-sm font-bold text-[#0B2560] shrink-0">
                          {result.doctor.name[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-[#0B2560] text-sm">Dr. {result.doctor.name}</p>
                        {result.doctor.title && <p className="text-gray-400 text-xs">{result.doctor.title}</p>}
                      </div>
                    </div>
                  )}
                  <Link href="/book" className="block">
                    <button className="w-full bg-[#0B2560] text-white py-3.5 rounded-2xl font-bold text-sm shadow-[0_8px_24px_rgba(11,37,96,0.25)] hover:-translate-y-0.5 transition flex items-center justify-center gap-2">
                      <Calendar size={14} /> {siteConfig.consultationCta}
                    </button>
                  </Link>
                  {siteConfig.publicWhatsApp && (
                    <a href={`https://wa.me/${siteConfig.publicWhatsApp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 border-2 border-gray-100 text-[#0B2560] py-3 rounded-2xl font-semibold text-sm hover:bg-[#f6faff] transition">
                      Chat on WhatsApp
                    </a>
                  )}
                  <p className="text-center text-xs text-gray-400 pt-1">{siteConfig.consultationSub}</p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        {/* ── RELATED RESULTS ── */}
        {related.length > 0 && (
          <section className="bg-[#f6faff] py-14 border-t border-blue-50">
            <div className="max-w-6xl mx-auto px-6">
              <h2 className="text-2xl font-headline font-extrabold text-[#0B2560] mb-8">More Patient Results</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {related.map((r: any) => (
                  <Link key={String(r._id)} href={`/results/${r.slug}`}
                    className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                    <div className="relative h-40 flex">
                      {r.before?.url && r.after?.url ? (
                        <>
                          <div className="relative flex-1 overflow-hidden">
                            <Image src={r.before.url} alt="Before" fill sizes="200px" className="object-cover" />
                          </div>
                          <div className="relative flex-1 overflow-hidden">
                            <Image src={r.after.url} alt="After" fill sizes="200px" className="object-cover" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full bg-gradient-to-br from-[#e8eff7] to-[#c5d9ef] flex items-center justify-center text-3xl">📸</div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-[#0B2560] text-sm leading-snug line-clamp-2 group-hover:text-[#3B82C4] transition">{r.title}</h3>
                      {r.category && <p className="text-gray-400 text-xs mt-1.5">{r.category}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <ArticleCtaBand
          consultationFree={siteConfig.consultationFree}
          consultationCta={siteConfig.consultationCta}
          publicWhatsApp={siteConfig.publicWhatsApp}
        />
      </main>
    </>
  );
}
