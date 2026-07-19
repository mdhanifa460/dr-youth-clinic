import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { connectDB } from '@/app/lib/mongodb';
import { HomepageSection } from '@/app/models/HomepageSection';
import { Review } from '@/app/models/Review';
import { Doctor } from '@/app/models/Doctor';
import { Video } from '@/app/models/Video';
import { Blog } from '@/app/models/Blog';
import { PageSeo } from '@/app/models/PageSeo';
import { LocationContent } from '@/app/models/LocationContent';
import Booking from '@/app/models/Booking';
import { HOMEPAGE_DEFAULTS } from '@/app/lib/homepageDefaults';
import { normalizeLegacyImageUrls } from '@/app/lib/legacyImageUrls';
import { resolveBanner } from '@/app/lib/banners/resolveBanner';
import BannerRenderer from '@/app/components/banners/BannerRenderer';

import HeroSection from '@/app/components/homepage/HeroSection';
import StatsBar from '@/app/components/homepage/StatsBar';
import ConsultationFormBar from '@/app/components/homepage/ConsultationFormBar';
import ServicesCards from '@/app/components/homepage/ServicesCards';
import BeforeAfterSection from '@/app/components/homepage/BeforeAfterSection';
import DoctorsSection from '@/app/components/homepage/DoctorsSection';
import FounderSection from '@/app/components/homepage/FounderSection';
import TrustTimeline from '@/app/components/homepage/TrustTimeline';
import HomepageLocations from '@/app/components/homepage/HomepageLocations';
import CTAStrip from '@/app/components/homepage/CTAStrip';
import TestimonialsSlider from '@/app/components/homepage/TestimonialsSlider';
import FAQAccordion from '@/app/components/homepage/FAQAccordion';
import { FAQSchema } from '@/app/components/SchemaMarkup';
import BlogInsights from '@/app/components/homepage/BlogInsights';
import VideoAcademySection from '@/app/components/homepage/VideoAcademySection';
export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

const getHomeSeo = unstable_cache(
  async () => {
    try {
      await connectDB();
      return PageSeo.findOne({ pageKey: 'home' } as any).lean() as Promise<any>;
    } catch { return null; }
  },
  ['home-seo'],
  { revalidate: 300, tags: ['page-seo'] }
);

const getCachedLocationEmbeds = unstable_cache(
  async () => {
    try {
      await connectDB();
      const docs = await LocationContent.find({
        location: { $in: ['chennai', 'bangalore', 'coimbatore', 'kochi'] },
      } as any).lean() as any[];
      return Object.fromEntries(
        docs.map((d) => [d.location, {
          googleMapsUrl:  (d as any).googleMapsUrl  || '',
          mapEmbedUrl:    (d as any).mapEmbedUrl    || '',
          heroImageUrl:   (d as any).heroImage?.url || '',
          clinicInfo:     (d as any).clinicInfo     || null,
        }])
      );
    } catch { return {}; }
  },
  ['location-embeds-v1'],
  { revalidate: 300, tags: ['location-content'] }
);

export async function generateMetadata(): Promise<Metadata> {
  try {
    const seo = await getHomeSeo();
    if (seo?.metaTitle) {
      return {
        // The homepage title stands alone (doesn't follow the "%s | DR Youth
        // Clinic" template every other page uses) — .absolute bypasses the
        // root layout's template, since an admin-authored homepage title is
        // meant to be the complete brand tagline, not a suffixed page title.
        title: { absolute: seo.metaTitle },
        description: seo.metaDescription || undefined,
        keywords: Array.isArray(seo.keywords) ? seo.keywords : [],
        alternates: { canonical: `${SITE_URL}/` },
        openGraph: {
          title: seo.metaTitle,
          description: seo.metaDescription || '',
          url: SITE_URL,
          siteName: 'DR Youth Clinic',
          type: 'website',
          locale: 'en_IN',
        },
        twitter: {
          card: 'summary_large_image',
          title: seo.metaTitle,
          description: seo.metaDescription || '',
        },
      };
    }
  } catch {
    // fall through to static defaults
  }
  return {
    title: { absolute: 'DR Youth Clinic – Advanced Skin & Aesthetic Care' },
    description: 'Trusted by 25,000+ patients across India. Expert dermatology, hair restoration & aesthetic treatments.',
    alternates: { canonical: `${SITE_URL}/` },
    openGraph: {
      title: 'DR Youth Clinic – Advanced Skin & Aesthetic Care',
      description: 'Trusted by 25,000+ patients across India.',
      url: SITE_URL,
      siteName: 'DR Youth Clinic',
      type: 'website',
      locale: 'en_IN',
    },
  };
}

type SectionOrderItem = {
  key: string;
  visible: boolean;
  order: number;
};

// The admin Homepage Builder's drag-and-drop reorder writes directly to each
// section's `order` field (see app/admin/homepage/page.tsx's handleReorder) —
// this must stay the sole source of truth for display order here, or admin
// reordering has no effect on the live site.
function sortPublicSections(sections: SectionOrderItem[]) {
  return [...sections].sort((a, b) => a.order - b.order);
}

const DEFAULT_SECTIONS = {
  sectionData: Object.fromEntries(
    Object.entries(HOMEPAGE_DEFAULTS).map(([k, v]) => [k, v.data])
  ),
  sectionOrder: sortPublicSections(
    Object.entries(HOMEPAGE_DEFAULTS)
      .filter(([k]) => !['topbar', 'header', 'footer'].includes(k))
      .map(([k, v]) => ({ key: k, visible: v.visible, order: v.order }))
  ),
};

// Bump cache key whenever the normalizer logic changes to avoid serving stale data.
const getCachedSections = unstable_cache(
  async () => {
    try {
      await connectDB();
      const raw = await HomepageSection.find({} as any).sort({ order: 1 }).lean() as any[];

      if (raw.length === 0) return DEFAULT_SECTIONS;

      return {
        sectionData: Object.fromEntries(
          raw.map((s) => [
            s.sectionKey,
            normalizeLegacyImageUrls({ ...s.data, visible: s.visible }),
          ])
        ),
        sectionOrder: raw
          .filter((s) => !['topbar', 'header', 'footer'].includes(s.sectionKey))
          .map((s) => ({ key: s.sectionKey, visible: s.visible, order: s.order })),
      };
    } catch {
      return DEFAULT_SECTIONS;
    }
  },
  ['homepage-sections-v3'],
  { revalidate: 300, tags: ['homepage-layout'] }
);

const getCachedReviews = unstable_cache(
  async (count: number, source: string, location: string, service: string) => {
    try {
      await connectDB();
      const filter: Record<string, any> = { isVisible: true, showOnHomepage: true };
      if (source) filter.source = source;
      if (location) filter.location = location;
      if (service) filter.services = service;
      const docs = await Review.find(filter as any)
        .sort({ isFeatured: -1, displayOrder: 1, createdAt: -1 })
        .limit(Math.min(count, 50))
        .lean();
      return JSON.parse(JSON.stringify(docs));
    } catch {
      return [];
    }
  },
  ['homepage-reviews-v2'],
  { revalidate: 60, tags: ['reviews'] }
);

const getCachedDoctors = unstable_cache(
  async (location: string) => {
    try {
      await connectDB();
      const filter = location
        ? { locations: { $in: [location, 'all'] }, active: true }
        : { active: true };
      const docs = await Doctor.find(filter as any)
        .sort({ order: 1, createdAt: -1 })
        .lean();
      return JSON.parse(JSON.stringify(docs));
    } catch {
      return [];
    }
  },
  ['homepage-doctors-v2'],
  { revalidate: 300, tags: ['doctors'] }
);

const getCachedBlogPosts = unstable_cache(
  async () => {
    try {
      await connectDB();
      const posts = await Blog.find({ active: true } as any)
        .sort({ featured: -1, publishedAt: -1 })
        .limit(3)
        .lean();
      return JSON.parse(JSON.stringify(posts));
    } catch {
      return [];
    }
  },
  ['homepage-blog-v1'],
  { revalidate: 300, tags: ['blog'] }
);

const getCachedFeaturedVideos = unstable_cache(
  async () => {
    try {
      await connectDB();
      const docs = await (Video as any)
        .find({ status: 'published' } as any)
        .sort({ featured: -1, displayOrder: 1, createdAt: -1 })
        .limit(9)
        .populate('doctor', 'name')
        .lean();
      return JSON.parse(JSON.stringify(docs));
    } catch {
      return [];
    }
  },
  ['homepage-video-academy'],
  { revalidate: 300, tags: ['videos'] }
);

// Live counts only — never admin-editable, so this section can't show fabricated
// numbers (see the comment on the trust_timeline default in homepageDefaults.ts).
const getCachedTrustStats = unstable_cache(
  async () => {
    try {
      await connectDB();
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [todayCount, weekCount, monthPatients] = await Promise.all([
        (Booking as any).countDocuments({ createdAt: { $gte: todayStart } }),
        (Booking as any).countDocuments({ status: 'completed', updatedAt: { $gte: weekStart } }),
        (Booking as any).distinct('phone', { status: 'completed', updatedAt: { $gte: monthStart } }),
      ]);

      return { todayCount, weekCount, monthCount: monthPatients.length };
    } catch {
      return null;
    }
  },
  ['homepage-trust-timeline'],
  { revalidate: 300, tags: ['bookings'] }
);

const SECTION_COMPONENTS: Record<string, React.ComponentType<{ data: any }>> = {
  hero: HeroSection,
  stats: StatsBar,
  consultation_form: ConsultationFormBar,
  services: ServicesCards,
  before_after: BeforeAfterSection,
  founder: FounderSection,
  trust_timeline: TrustTimeline,
  doctors: DoctorsSection,
  video_academy: VideoAcademySection,
  locations: HomepageLocations,
  cta_strip: CTAStrip,
  testimonials: TestimonialsSlider,
  faq: FAQAccordion,
  blog: BlogInsights,
};

export default async function Home() {
  const { sectionData, sectionOrder } = await getCachedSections();
  const publicSectionOrder = sortPublicSections(sectionOrder);

  const testimonialsConfig = publicSectionOrder.find((s) => s.key === 'testimonials' && s.visible);
  const td = sectionData['testimonials'] ?? {};

  const preferredLocation = cookies().get('preferred_location')?.value || '';

  // Vercel injects x-vercel-ip-city on every request — no external API needed
  const rawCity = headers().get('x-vercel-ip-city') || '';
  const detectedCity = rawCity ? decodeURIComponent(rawCity) : '';

  const [initialReviews, locationEmbeds, liveDoctors, liveBlogPosts, liveVideos, trustStats, heroBanner] = await Promise.all([
    testimonialsConfig
      ? getCachedReviews(td.displayCount ?? 6, td.filterSource || '', td.filterLocation || '', td.filterService || '')
      : Promise.resolve([]),
    getCachedLocationEmbeds(),
    getCachedDoctors(''), // fetch all — client filters by detected location
    getCachedBlogPosts(),
    getCachedFeaturedVideos(),
    getCachedTrustStats(),
    resolveBanner({ page: 'homepage' }),
  ]);

  const enriched = {
    ...sectionData,
    testimonials: { ...td, _reviews: initialReviews },
    locations: { ...(sectionData['locations'] ?? {}), _embeds: locationEmbeds, _detectedCity: detectedCity },
    doctors: {
      ...(sectionData['doctors'] ?? {}),
      doctors: liveDoctors,
      _detectedCity: detectedCity,
    },
    video_academy: {
      ...(sectionData['video_academy'] ?? {}),
      videos: liveVideos,
    },
    blog: {
      ...(sectionData['blog'] ?? {}),
      posts: liveBlogPosts.length > 0 ? liveBlogPosts : (sectionData['blog']?.posts ?? []),
    },
    trust_timeline: {
      ...(sectionData['trust_timeline'] ?? {}),
      todayCount: trustStats?.todayCount ?? null,
      weekCount: trustStats?.weekCount ?? null,
      monthCount: trustStats?.monthCount ?? null,
    },
  };

  const faqItems: { question: string; answer: string }[] = enriched['faq']?.faqs ?? [];

  return (
    <main>
      <FAQSchema faqs={faqItems} />
      {publicSectionOrder
        .filter((s) => s.visible)
        .map((s) => {
          // A matching Banner (admin-configured, scheduled/targeted) takes
          // over the hero slot when one exists; otherwise the existing
          // HomepageSection-driven HeroSection renders exactly as before —
          // this feature never deletes the original hero, only overrides it.
          if (s.key === 'hero' && heroBanner) {
            return (
              <div key={s.key}>
                <BannerRenderer banner={heroBanner} />
              </div>
            );
          }
          const Component = SECTION_COMPONENTS[s.key];
          if (!Component) return null;
          return (
            <div key={s.key}>
              <Component data={enriched[s.key]} />
            </div>
          );
        })}
    </main>
  );
}
