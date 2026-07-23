import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connectDB } from '@/app/lib/mongodb';
import { Story } from '@/app/models/Story';
import { Doctor } from '@/app/models/Doctor';
import { Service } from '@/app/models/Service';
import { Offer } from '@/app/models/Offer';
import { Result } from '@/app/models/Result';
import { getSiteConfig } from '@/app/lib/siteConfig';
import { recommend } from '@/app/lib/rag/RecommendationService';
import { BreadcrumbSchema } from '@/app/components/SchemaMarkup';
import StoryViewer from './StoryViewer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

async function getStory(slug: string) {
  try {
    await connectDB();
    const story = await (Story as any).findOne({ slug, status: 'published' }).populate('storyType', 'name icon slug').lean();
    if (!story) return null;
    return JSON.parse(JSON.stringify(story));
  } catch { return null; }
}

async function getRelatedStories(excludeId: string, storyTypeId: string) {
  try {
    await connectDB();
    let list = await (Story as any).find({ _id: { $ne: excludeId }, status: 'published', storyType: storyTypeId })
      .select('-slides').populate('storyType', 'name icon').sort({ publishedAt: -1 }).limit(6).lean();
    if (list.length < 6) {
      const more = await (Story as any).find({ _id: { $ne: excludeId, $nin: list.map((s: any) => s._id) }, status: 'published' })
        .select('-slides').populate('storyType', 'name icon').sort({ publishedAt: -1 }).limit(6 - list.length).lean();
      list = [...list, ...more];
    }
    return JSON.parse(JSON.stringify(list));
  } catch { return []; }
}

// Related content is derived two ways: first from what the story's own
// slides actually reference (doctor_card/service_card/offer_card/result_card
// elements) — the most precise signal available — and only falls back to
// the generic vector-search recommendation engine when a story references
// nothing explicitly.
async function getRelatedEntities(story: any) {
  const ids = { doctor: new Set<string>(), service: new Set<string>(), offer: new Set<string>(), result: new Set<string>() };
  for (const slide of story.slides || []) {
    for (const el of slide.elements || []) {
      if (el.type === 'doctor_card' && el.data?.doctorId) ids.doctor.add(el.data.doctorId);
      if (el.type === 'service_card' && el.data?.serviceId) ids.service.add(el.data.serviceId);
      if (el.type === 'offer_card' && el.data?.offerId) ids.offer.add(el.data.offerId);
      if (el.type === 'result_card' && el.data?.resultId) ids.result.add(el.data.resultId);
    }
  }

  try {
    await connectDB();
    const [doctors, services, offers, results] = await Promise.all([
      ids.doctor.size ? (Doctor as any).find({ _id: { $in: Array.from(ids.doctor) } }).lean() : [],
      ids.service.size ? (Service as any).find({ _id: { $in: Array.from(ids.service) } }).lean() : [],
      ids.offer.size ? (Offer as any).find({ _id: { $in: Array.from(ids.offer) } }).lean() : [],
      ids.result.size ? (Result as any).find({ _id: { $in: Array.from(ids.result) } }).lean() : [],
    ]);

    const hasAny = doctors.length || services.length || offers.length || results.length;
    if (!hasAny) {
      const query = [story.title, story.description].filter(Boolean).join(' — ');
      const recs = await recommend(query, { limit: 4 }).catch(() => []);
      return { doctors: [], services: [], offers: [], results: [], recommendations: recs };
    }
    return {
      doctors: JSON.parse(JSON.stringify(doctors)),
      services: JSON.parse(JSON.stringify(services)),
      offers: JSON.parse(JSON.stringify(offers)),
      results: JSON.parse(JSON.stringify(results)),
      recommendations: [],
    };
  } catch {
    return { doctors: [], services: [], offers: [], results: [], recommendations: [] };
  }
}

export async function generateStaticParams() {
  try {
    await connectDB();
    const stories = await (Story as any).find({ status: 'published' }).select('slug').lean();
    return stories.filter((s: any) => s.slug).map((s: any) => ({ slug: s.slug }));
  } catch { return []; }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const story = await getStory(params.slug);
  if (!story) return { title: 'Story Not Found' };
  const title = story.seoTitle || story.title;
  const description = story.seoDescription || story.description || `${story.title} — a web story from DR Youth Clinic.`;
  const image = story.coverImage?.url;
  return {
    title,
    description,
    keywords: story.seoKeywords?.length ? story.seoKeywords : undefined,
    alternates: { canonical: `${SITE_URL}/web-stories/${params.slug}` },
    openGraph: {
      title, description,
      images: image ? [{ url: image, width: 1080, height: 1920 }] : [],
      type: 'article',
    },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : undefined },
  };
}

export default async function StoryDetailPage({ params }: { params: { slug: string } }) {
  const story = await getStory(params.slug);
  if (!story) notFound();

  const [related, entities, siteConfig] = await Promise.all([
    getRelatedStories(story._id, story.storyType?._id),
    getRelatedEntities(story),
    getSiteConfig(),
  ]);

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Web Stories', url: `${SITE_URL}/web-stories` },
          { name: story.title, url: `${SITE_URL}/web-stories/${story.slug}` },
        ]}
      />
      <StoryViewer story={story} related={related} entities={entities} siteConfig={siteConfig} />
    </>
  );
}
