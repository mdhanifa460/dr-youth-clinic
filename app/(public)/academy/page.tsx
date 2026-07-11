import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { connectDB } from '@/app/lib/mongodb';
import { Video } from '@/app/models/Video';
import AcademyClient from './AcademyClient';
import { getSiteConfig } from '@/app/lib/siteConfig';

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
export const metadata: Metadata = {
  title: 'Skin & Hair Academy | DR Youth Clinic',
  description:
    'Watch expert-led videos on skin, hair, laser and aesthetic treatments from the specialists at DR Youth Clinic — real answers, real results, real patient stories.',
  alternates: { canonical: `${SITE_URL}/academy` },
};

const getVideos = unstable_cache(
  async () => {
    try {
      await connectDB();
      const videos = await (Video as any)
        .find({ status: 'published' })
        .sort({ displayOrder: 1, createdAt: -1 })
        .populate('doctor', 'name photo title experience')
        .lean();
      return JSON.parse(JSON.stringify(videos));
    } catch {
      return [];
    }
  },
  ['public-academy-videos'],
  { revalidate: 300, tags: ['academy-videos'] }
);

export default async function AcademyPage() {
  const [videos, siteConfig] = await Promise.all([getVideos(), getSiteConfig()]);

  return (
    <main>
      {/* ── HERO ── */}
      <section className="relative bg-[#0B2560] overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full bg-[#F5A623]/10 pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-48 h-48 rounded-full bg-white/[0.03] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-24">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-0.5 bg-[#F5A623]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623]">Video Academy</p>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-headline font-extrabold text-white leading-tight mb-4">
            🎥 Skin &amp; Hair<br />
            <span className="text-[#F5A623]">Academy</span>
          </h1>
          <p className="text-white/60 max-w-xl text-sm md:text-base leading-relaxed mb-8">
            Expert-led videos on skin, hair, laser and aesthetic treatments — straight from our specialists. Learn what to expect, before you book.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/book"
              className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-6 py-3 rounded-2xl font-extrabold text-sm hover:-translate-y-0.5 transition shadow-lg"
            >
              <Calendar size={15} /> {siteConfig.consultationBadge}
            </Link>
          </div>
        </div>
      </section>

      {/* ── VIDEO GRID ── */}
      <section className="bg-[#f6faff] py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          {videos.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-6xl mb-4">🎬</p>
              <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-2">New Videos Coming Soon</h2>
              <p className="text-gray-500 mb-6">
                We're filming expert answers to your skin &amp; hair questions. Check back shortly or book a {siteConfig.consultationFree ? 'free ' : ''}consultation.
              </p>
              <Link
                href="/book"
                className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-6 py-3 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition"
              >
                <Calendar size={15} /> {siteConfig.consultationCta}
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3B82C4] mb-2">Watch &amp; Learn</p>
                <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-[#0B2560]">All Videos</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {videos.length} video{videos.length !== 1 ? 's' : ''} available
                </p>
              </div>
              <AcademyClient videos={videos} />
            </>
          )}
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="bg-[#0B2560] py-14">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-3">Ready to Begin?</p>
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-white mb-3">
            Have Questions After Watching?
          </h2>
          <p className="text-white/60 text-sm mb-8 max-w-md mx-auto">
            Talk to our specialists directly — book a {siteConfig.consultationFree ? 'free ' : ''}consultation and get a personalised treatment plan.
          </p>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-8 py-3.5 rounded-2xl font-extrabold text-sm hover:-translate-y-0.5 transition shadow-lg"
          >
            <Calendar size={15} /> {siteConfig.consultationCta}
          </Link>
        </div>
      </section>
    </main>
  );
}
