import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronRight, Award, Calendar, Play } from 'lucide-react';
import { connectDB } from '@/app/lib/mongodb';
import { Video } from '@/app/models/Video';
import VideoPlayer from './VideoPlayer';

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

interface PageProps {
  params: { slug: string };
}

async function getVideo(slug: string) {
  try {
    await connectDB();
    return await (Video as any)
      .findOne({ slug, status: 'published' })
      .populate('doctor')
      .populate('service', 'name urlSlug')
      .lean();
  } catch {
    return null;
  }
}

async function getJourneyVideos(journeyKey: string) {
  try {
    await connectDB();
    return await (Video as any)
      .find({ journeyKey, status: 'published' })
      .sort({ journeyOrder: 1 })
      .select('title slug thumbnail duration journeyOrder')
      .lean();
  } catch {
    return [];
  }
}

async function getCategoryVideos(category: string, excludeId: string) {
  try {
    await connectDB();
    return await (Video as any)
      .find({ category, status: 'published', _id: { $ne: excludeId } })
      .sort({ displayOrder: 1 })
      .limit(4)
      .select('title slug thumbnail duration category')
      .lean();
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const video = await getVideo(params.slug);
  if (!video) return {};

  const description = video.transcript
    ? video.transcript.slice(0, 155).trim() + (video.transcript.length > 155 ? '…' : '')
    : `Watch "${video.title}" — expert insights from DR Youth Clinic on ${video.category.toLowerCase()} treatments.`;

  return {
    title: `${video.title} | DR Youth Clinic`,
    description,
    alternates: { canonical: `${SITE_URL}/academy/${video.slug}` },
    openGraph: {
      title: video.title,
      description,
      url: `${SITE_URL}/academy/${video.slug}`,
      images: video.thumbnail?.url ? [{ url: video.thumbnail.url, width: 1200, height: 630 }] : [],
      type: 'video.other',
    },
  };
}

function getInitials(name?: string): string {
  return name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export default async function VideoDetailPage({ params }: PageProps) {
  const video = await getVideo(params.slug);
  if (!video) notFound();

  const doctor = video.doctor as any;

  const related = video.journeyKey
    ? await getJourneyVideos(video.journeyKey)
    : await getCategoryVideos(video.category, String(video._id));
  const isJourney = Boolean(video.journeyKey) && related.length > 1;

  return (
    <main className="bg-[#f6faff] min-h-screen pb-24 lg:pb-16">
      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <nav className="flex items-center gap-1.5 text-xs text-gray-400">
          <Link href="/" className="hover:text-[#0B2560] transition">Home</Link>
          <ChevronRight size={12} />
          <Link href="/academy" className="hover:text-[#0B2560] transition">Video Academy</Link>
          <ChevronRight size={12} />
          <span className="text-[#0B2560] font-semibold line-clamp-1">{video.title}</span>
        </nav>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 grid lg:grid-cols-3 gap-8 lg:gap-10 items-start">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <span className="inline-block bg-[#F5A623]/15 text-[#B9790B] text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
              {video.category}
            </span>
            <h1 className="text-2xl md:text-3xl font-headline font-extrabold text-[#0B2560] mt-3 leading-tight">
              {video.title}
            </h1>
            <p className="text-gray-400 text-sm mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {video.duration && <span>{video.duration}</span>}
              {doctor?.name && <span>· {doctor.name}</span>}
              {video.language && <span>· {video.language}</span>}
            </p>
          </div>

          <VideoPlayer youtubeId={video.youtubeId} title={video.title} chapters={video.chapters || []} />

          {video.transcript && (
            <details className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 group">
              <summary className="cursor-pointer font-semibold text-[#0B2560] text-sm list-none flex items-center justify-between">
                Show Transcript
                <span className="text-[#0B2560] text-lg font-light transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="text-gray-600 text-sm leading-relaxed mt-4 whitespace-pre-line">
                {video.transcript}
              </p>
            </details>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-6">
          {doctor && (
            <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 bg-gradient-to-br from-[#0B2560] to-[#3B82C4]">
                  {doctor.photo?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={doctor.photo.url} alt={doctor.name} className="absolute inset-0 w-full h-full object-cover object-top" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white font-headline font-extrabold text-lg tracking-wider">
                      {getInitials(doctor.name)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-[#0B2560] text-base leading-snug truncate">{doctor.name}</h3>
                  {doctor.title && <p className="text-[#3B82C4] text-sm font-medium truncate">{doctor.title}</p>}
                  {doctor.experience > 0 && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <Award size={11} className="text-[#F5A623] shrink-0" />
                      {doctor.experience}+ Years Experience
                    </p>
                  )}
                </div>
              </div>
              <Link
                href="/book"
                className="mt-4 w-full flex items-center justify-center gap-2 bg-[#0B2560] hover:bg-[#0d2d73] text-white text-sm font-bold py-3 rounded-xl transition"
              >
                <Calendar size={15} /> Book Consultation
              </Link>
            </div>
          )}

          {/* Sticky consultation CTA (desktop: sits in sidebar and scrolls with it via lg:sticky above) */}
          <div className="bg-gradient-to-br from-[#0B2560] to-[#122d6e] rounded-2xl md:rounded-3xl p-5 text-white shadow-[0_12px_32px_rgba(11,37,96,0.25)]">
            <p className="font-headline font-extrabold text-lg leading-snug">Still have questions?</p>
            <p className="text-white/70 text-sm mt-1.5">
              Talk to our specialists for a personalized treatment plan.
            </p>
            <Link
              href="/book"
              className="mt-4 w-full flex items-center justify-center gap-2 bg-[#F5A623] hover:bg-[#e69712] text-[#0B2560] text-sm font-bold py-3 rounded-xl transition"
            >
              <Calendar size={15} /> Book Consultation
            </Link>
          </div>
        </aside>
      </div>

      {/* Related videos / Treatment Journey */}
      {related.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-14">
          <h2 className="text-xl md:text-2xl font-headline font-extrabold text-[#0B2560] mb-5">
            {isJourney ? 'Treatment Journey' : 'Related Videos'}
          </h2>

          {isJourney ? (
            <ol className="space-y-3">
              {related.map((v: any, i: number) => {
                const isCurrent = String(v._id) === String(video._id);
                return (
                  <li key={String(v._id)}>
                    <Link
                      href={isCurrent ? '#' : `/academy/${v.slug}`}
                      aria-current={isCurrent ? 'step' : undefined}
                      className={`flex items-center gap-4 rounded-2xl border p-4 transition ${
                        isCurrent
                          ? 'bg-[#0B2560] border-[#0B2560] text-white shadow-lg cursor-default'
                          : 'bg-white border-gray-100 hover:border-[#3B82C4]/40 hover:shadow-md'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                          isCurrent ? 'bg-[#F5A623] text-[#0B2560]' : 'bg-[#f6faff] text-[#0B2560]'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className={`font-semibold text-sm flex-1 ${isCurrent ? 'text-white' : 'text-[#0B2560]'}`}>
                        {v.title}
                      </span>
                      {v.duration && (
                        <span className={`text-xs shrink-0 ${isCurrent ? 'text-white/70' : 'text-gray-400'}`}>
                          {v.duration}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {related.map((v: any) => (
                <Link
                  key={String(v._id)}
                  href={`/academy/${v.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="relative aspect-video bg-gray-100">
                    {v.thumbnail?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.thumbnail.url} alt={v.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#0B2560] to-[#3B82C4]" />
                    )}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <Play size={14} className="text-[#0B2560] ml-0.5" fill="currentColor" />
                      </div>
                    </div>
                    {v.duration && (
                      <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                        {v.duration}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-headline font-bold text-[#0B2560] text-sm leading-snug line-clamp-2">{v.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FAQ */}
      {video.faq?.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-14">
          <h2 className="text-xl md:text-2xl font-headline font-extrabold text-[#0B2560] mb-5">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3 max-w-3xl">
            {video.faq.map((item: any, i: number) => (
              <details
                key={i}
                className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm group"
                {...(i === 0 ? { open: true } : {})}
              >
                <summary className="min-h-14 w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left cursor-pointer list-none">
                  <span className="font-semibold text-[#0B2560] text-sm pr-4">{item.question}</span>
                  <span className="text-[#0B2560] text-xl font-light transition-transform shrink-0 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5">
                  <p className="text-gray-600 text-sm leading-relaxed">{item.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Mobile sticky CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-200 shadow-2xl shadow-black/20 px-4 py-3 flex items-center gap-3">
        <p className="text-xs font-semibold text-[#0B2560] flex-1 leading-snug">Still have questions?</p>
        <Link
          href="/book"
          className="shrink-0 flex items-center gap-1.5 bg-[#0B2560] text-white text-xs font-bold px-4 py-2.5 rounded-xl"
        >
          <Calendar size={13} /> Book Consultation
        </Link>
      </div>
    </main>
  );
}
