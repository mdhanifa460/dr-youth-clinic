import { unstable_cache } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { HomepageSection } from '@/app/models/HomepageSection';
import { Review } from '@/app/models/Review';
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

const DEFAULT_SECTIONS = {
  sectionData: Object.fromEntries(
    Object.entries(HOMEPAGE_DEFAULTS).map(([k, v]) => [k, v.data])
  ),
  sectionOrder: Object.entries(HOMEPAGE_DEFAULTS)
    .filter(([k]) => !['topbar', 'header', 'footer'].includes(k))
    .map(([k, v]) => ({ key: k, visible: v.visible, order: v.order })),
};

// Bump cache key whenever the normalizer logic changes to avoid serving stale data.
const getCachedSections = unstable_cache(
  async () => {
    try {
      await connectDB();
      const raw = await HomepageSection.find({}).sort({ order: 1 }).lean() as any[];

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
      const docs = await Review.find(filter)
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

  // Only fetch reviews when the testimonials section is enabled
  const testimonialsConfig = sectionOrder.find((s) => s.key === 'testimonials' && s.visible);
  const td = sectionData['testimonials'] ?? {};
  const initialReviews = testimonialsConfig
    ? await getCachedReviews(td.displayCount ?? 6, td.filterSource || '', td.filterLocation || '', td.filterService || '')
    : [];

  // Pass server-fetched reviews into the section data — slider uses them directly,
  // no client-side fetch needed.
  const enriched = {
    ...sectionData,
    testimonials: { ...td, _reviews: initialReviews },
  };

  return (
    <main>
      {sectionOrder
        .filter((s) => s.visible)
        .map((s) => {
          const Component = SECTION_COMPONENTS[s.key];
          if (!Component) return null;
          return <Component key={s.key} data={enriched[s.key]} />;
        })}
    </main>
  );
}
