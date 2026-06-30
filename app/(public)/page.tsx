import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { cookies } from 'next/headers';
import { connectDB } from '@/app/lib/mongodb';
import { HomepageSection } from '@/app/models/HomepageSection';
import { Review } from '@/app/models/Review';
import { Doctor } from '@/app/models/Doctor';
import { Blog } from '@/app/models/Blog';
import { PageSeo } from '@/app/models/PageSeo';
import { LocationContent } from '@/app/models/LocationContent';
import { HOMEPAGE_DEFAULTS } from '@/app/lib/homepageDefaults';
import { normalizeLegacyImageUrls } from '@/app/lib/legacyImageUrls';

import HeroSection from '@/app/components/homepage/HeroSection';
import StatsBar from '@/app/components/homepage/StatsBar';
import ConsultationFormBar from '@/app/components/homepage/ConsultationFormBar';
import ServicesCards from '@/app/components/homepage/ServicesCards';
import BeforeAfterSection from '@/app/components/homepage/BeforeAfterSection';
import DoctorsSection from '@/app/components/homepage/DoctorsSection';
import HomepageLocations from '@/app/components/homepage/HomepageLocations';
import CTAStrip from '@/app/components/homepage/CTAStrip';
import TestimonialsSlider from '@/app/components/homepage/TestimonialsSlider';
import FAQAccordion from '@/app/components/homepage/FAQAccordion';
import BlogInsights from '@/app/components/homepage/BlogInsights';

export const revalidate = 300;

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
        title: seo.metaTitle,
        description: seo.metaDescription || undefined,
        keywords: Array.isArray(seo.keywords) ? seo.keywords : [],
        openGraph: {
          title: seo.metaTitle,
          description: seo.metaDescription || '',
          url: 'https://dryouthclinic.com',
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
    title: 'DR Youth Clinic – Advanced Skin & Aesthetic Care',
    description: 'Trusted by 25,000+ patients across India. Expert dermatology, hair restoration & aesthetic treatments.',
    openGraph: {
      title: 'DR Youth Clinic – Advanced Skin & Aesthetic Care',
      description: 'Trusted by 25,000+ patients across India.',
      url: 'https://dryouthclinic.com',
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

const PUBLIC_SECTION_ORDER = [
  'hero',
  'stats',
  'consultation_form',
  'cta_strip',
  'before_after',
  'services',
  'doctors',
  'locations',
  'testimonials',
  'faq',
  'blog',
];

const PUBLIC_SECTION_RANK = new Map(
  PUBLIC_SECTION_ORDER.map((key, index) => [key, index])
);

function sortPublicSections(sections: SectionOrderItem[]) {
  return [...sections].sort((a, b) => {
    const rankA = PUBLIC_SECTION_RANK.get(a.key) ?? 1000 + a.order;
    const rankB = PUBLIC_SECTION_RANK.get(b.key) ?? 1000 + b.order;

    return rankA - rankB || a.order - b.order;
  });
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
        ? { location: { $in: [location, 'all'] }, active: true }
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

const SECTION_COMPONENTS: Record<string, React.ComponentType<{ data: any }>> = {
  hero: HeroSection,
  stats: StatsBar,
  consultation_form: ConsultationFormBar,
  services: ServicesCards,
  before_after: BeforeAfterSection,
  doctors: DoctorsSection,
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

  const [initialReviews, locationEmbeds, liveDoctors, liveBlogPosts] = await Promise.all([
    testimonialsConfig
      ? getCachedReviews(td.displayCount ?? 6, td.filterSource || '', td.filterLocation || '', td.filterService || '')
      : Promise.resolve([]),
    getCachedLocationEmbeds(),
    getCachedDoctors(preferredLocation),
    getCachedBlogPosts(),
  ]);

  const enriched = {
    ...sectionData,
    testimonials: { ...td, _reviews: initialReviews },
    locations: { ...(sectionData['locations'] ?? {}), _embeds: locationEmbeds },
    doctors: {
      ...(sectionData['doctors'] ?? {}),
      doctors: liveDoctors,
    },
    blog: {
      ...(sectionData['blog'] ?? {}),
      posts: liveBlogPosts.length > 0 ? liveBlogPosts : (sectionData['blog']?.posts ?? []),
    },
  };

  return (
    <main>
      {publicSectionOrder
        .filter((s) => s.visible)
        .map((s) => {
          const Component = SECTION_COMPONENTS[s.key];
          if (!Component) return null;
          return <Component key={s.key} data={enriched[s.key]} />;
        })}
    </main>
  );
}
