import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { getSiteConfig } from '@/app/lib/siteConfig';
import { connectDB } from '@/app/lib/mongodb';
import { Doctor } from '@/app/models/Doctor';
import { Review } from '@/app/models/Review';
import { HomepageSection } from '@/app/models/HomepageSection';
import { makeDefaultAboutSections, type AboutSection } from '@/app/lib/aboutPageDefaults';

import HeroSection from '@/app/components/about/sections/HeroSection';
import StorySection from '@/app/components/about/sections/StorySection';
import TimelineSection from '@/app/components/about/sections/TimelineSection';
import ValuesSection from '@/app/components/about/sections/ValuesSection';
import LeadershipSection from '@/app/components/about/sections/LeadershipSection';
import ExpertsSection from '@/app/components/about/sections/ExpertsSection';
import TechnologySection from '@/app/components/about/sections/TechnologySection';
import JourneySection from '@/app/components/about/sections/JourneySection';
import GallerySection from '@/app/components/about/sections/GallerySection';
import AwardsSection from '@/app/components/about/sections/AwardsSection';
import ComparisonSection from '@/app/components/about/sections/ComparisonSection';
import CommunitySection from '@/app/components/about/sections/CommunitySection';
import ReviewsSection from '@/app/components/about/sections/ReviewsSection';
import FaqSection from '@/app/components/about/sections/FaqSection';
import CtaSection from '@/app/components/about/sections/CtaSection';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
export const metadata: Metadata = {
  title: 'About Us | DR Youth Clinic',
  description:
    'Learn about DR Youth Clinic — South India\'s most trusted aesthetic medicine practice with 15+ years of experience, 50,000+ patients treated across Chennai, Bangalore, Kochi and Coimbatore.',
  alternates: { canonical: `${SITE_URL}/about` },
};

export const revalidate = 300;

const getCachedAboutSections = unstable_cache(
  async (): Promise<AboutSection[]> => {
    try {
      await connectDB();
      const s = await HomepageSection.findOne({ sectionKey: 'about_page' } as any).lean() as any;
      const sections = s?.data?.sections;
      return Array.isArray(sections) && sections.length ? sections : makeDefaultAboutSections();
    } catch {
      return makeDefaultAboutSections();
    }
  },
  ['about-page-sections'],
  { revalidate: 300, tags: ['about-page'] }
);

async function getFeaturedDoctors() {
  try {
    await connectDB();
    const docs = await Doctor.find({ active: true } as any)
      .sort({ order: 1, createdAt: -1 })
      .limit(3)
      .lean();
    return JSON.parse(JSON.stringify(docs));
  } catch {
    return [];
  }
}

// Prefetches reviews server-side so ReviewsSection (TestimonialsSlider) can skip its
// own client-side fetch/loading-spinner, mirroring app/(public)/page.tsx's pattern.
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
  ['about-page-reviews'],
  { revalidate: 60, tags: ['reviews'] }
);

async function getTestimonialsData() {
  try {
    await connectDB();
    const s = await HomepageSection.findOne({ sectionKey: 'testimonials' } as any).lean() as any;
    const data = s?.data ?? {};
    const reviews = await getCachedReviews(data.displayCount ?? 6, data.filterSource || '', data.filterLocation || '', data.filterService || '');
    return { ...data, _reviews: reviews };
  } catch {
    return {};
  }
}

async function getGeneralFaqs() {
  try {
    await connectDB();
    const s = await HomepageSection.findOne({ sectionKey: 'faq' } as any).lean() as any;
    const items = (s?.data?.faqs ?? []) as { question: string; answer: string; category?: string }[];
    return items.filter((f) => !f.category || f.category === 'General');
  } catch {
    return [];
  }
}

export default async function AboutPage() {
  const [sections, { consultationCta }, doctors, testimonialsData, faqs] = await Promise.all([
    getCachedAboutSections(),
    getSiteConfig(),
    getFeaturedDoctors(),
    getTestimonialsData(),
    getGeneralFaqs(),
  ]);

  return (
    <main>
      {sections.filter((s) => s.visible).map((section) => {
        switch (section.type) {
          case 'hero':
            return <HeroSection key={section.id} data={section.data} />;
          case 'story':
            return <StorySection key={section.id} data={section.data} />;
          case 'timeline':
            return <TimelineSection key={section.id} data={section.data} />;
          case 'values':
            return <ValuesSection key={section.id} data={section.data} />;
          case 'leadership':
            return <LeadershipSection key={section.id} data={section.data} />;
          case 'experts':
            return <ExpertsSection key={section.id} data={section.data} doctors={doctors} />;
          case 'technology':
            return <TechnologySection key={section.id} data={section.data} />;
          case 'journey':
            return <JourneySection key={section.id} data={section.data} />;
          case 'gallery':
            return <GallerySection key={section.id} data={section.data} />;
          case 'awards':
            return <AwardsSection key={section.id} data={section.data} />;
          case 'comparison':
            return <ComparisonSection key={section.id} data={section.data} />;
          case 'community':
            return <CommunitySection key={section.id} data={section.data} />;
          case 'reviews':
            return <ReviewsSection key={section.id} data={testimonialsData} />;
          case 'faq':
            return <FaqSection key={section.id} data={section.data} faqs={faqs} />;
          case 'cta':
            return <CtaSection key={section.id} data={section.data} consultationCta={consultationCta} />;
          default:
            return null;
        }
      })}
    </main>
  );
}
