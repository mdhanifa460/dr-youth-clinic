import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { HomepageSection } from '@/app/models/HomepageSection';
import { FAQSchema } from '@/app/components/SchemaMarkup';
import FAQPageClient from './FAQPageClient';
import { getSiteConfig } from '@/app/lib/siteConfig';
import { STATIC_FAQS } from '@/app/lib/rag/staticFaqs';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
export const metadata: Metadata = {
  title: 'FAQs | DR Youth Clinic — Skin, Hair & Laser Treatments',
  description:
    'Get answers to the most common questions about skin, hair and laser treatments at DR Youth Clinic. Everything from pricing and safety to recovery time and booking.',
  alternates: { canonical: `${SITE_URL}/faqs` },
  openGraph: {
    title: 'Frequently Asked Questions | DR Youth Clinic',
    description:
      'Answers to your questions about dermatology, laser, hair and skin treatments in Chennai, Bangalore, Kochi and Coimbatore.',
    url: `${SITE_URL}/faqs`,
    siteName: 'DR Youth Clinic',
    type: 'website',
  },
};

const getCmsFaqs = unstable_cache(
  async () => {
    try {
      await connectDB();
      const section = await HomepageSection.findOne({ sectionKey: 'faq' } as any).lean() as any;
      return (section?.data?.faqs ?? []) as { question: string; answer: string; category?: string }[];
    } catch {
      return [];
    }
  },
  ['cms-faqs'],
  { revalidate: 300, tags: ['homepage-layout'] }
);

// Admin-editable "Stats Bar" section (HomepageSection sectionKey: 'stats') — reused here
// so the FAQ hero doesn't need its own brand-new CMS fields for patient count / rating.
const getStatsData = unstable_cache(
  async () => {
    try {
      await connectDB();
      const section = await HomepageSection.findOne({ sectionKey: 'stats' } as any).lean() as any;
      return (section?.data?.stats ?? []) as { value: string; label: string }[];
    } catch {
      return [];
    }
  },
  ['cms-stats-for-faqs'],
  { revalidate: 300, tags: ['homepage-layout'] }
);

export default async function FAQPage() {
  const [cmsFaqs, statsData, siteConfig] = await Promise.all([getCmsFaqs(), getStatsData(), getSiteConfig()]);

  // The "free consultation" FAQ answer is a factual claim, not just CTA copy —
  // keep it in sync with Settings → Free Label Controls so it never promises
  // something the clinic isn't currently offering.
  const consultationQuestion = siteConfig.consultationFree
    ? 'Do you offer a free consultation?'
    : 'Do you offer a consultation?';
  const consultationAnswer = siteConfig.consultationFree
    ? 'Yes, we offer a free first consultation for most treatments. Our doctors will evaluate your skin or scalp condition, discuss your goals, and recommend a personalised treatment plan — with no obligation.'
    : 'Yes. Our doctors will evaluate your skin or scalp condition, discuss your goals, and recommend a personalised treatment plan — with no obligation.';

  // Merge CMS FAQs (filtered by category, defaulting to 'General') into each
  // hardcoded default category. CMS items are de-duped against the defaults by
  // question text and take priority (listed first).
  const allFaqs = STATIC_FAQS.map((cat) => {
    const existingQuestions = new Set(cat.items.map((i) => i.question));
    const newItems = cmsFaqs.filter(
      (f) => (f.category || 'General') === cat.category && !existingQuestions.has(f.question)
    );
    const items = [...newItems, ...cat.items].map((item) =>
      item.question === 'Do you offer a free consultation?'
        ? { ...item, question: consultationQuestion, answer: consultationAnswer }
        : item
    );
    return { ...cat, items };
  });

  const allFlatFaqs = allFaqs.flatMap((c) => c.items);

  // Reuse the existing admin-editable "Stats Bar" (homepage) values for the hero
  // strip instead of inventing new CMS fields for just these two stats.
  const patientsStat = statsData.find((s) => /patient/i.test(s.label))?.value;
  const ratingStat = statsData.find((s) => /rating/i.test(s.label))?.value;
  const heroStats = {
    questionsValue: `${Math.max(allFlatFaqs.length, 1)}+`,
    patientsValue: patientsStat || '25K+',
    ratingValue: ratingStat ? `${ratingStat.replace(/\/5$/, '')}★` : '4.9★',
  };

  return (
    <>
      <FAQSchema faqs={allFlatFaqs.slice(0, 20)} />
      <FAQPageClient categories={allFaqs} heroStats={heroStats} />
    </>
  );
}
