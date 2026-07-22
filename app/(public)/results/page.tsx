import { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { HomepageSection } from '@/app/models/HomepageSection';
import { Result } from '@/app/models/Result';
import { HOMEPAGE_DEFAULTS } from '@/app/lib/homepageDefaults';
import ResultsClient from './ResultsClient';

export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
export const metadata: Metadata = {
  title: 'Before & After Results',
  description: 'See real patient transformation results — skin, hair, laser and more at DR Youth Clinic.',
  alternates: { canonical: `${SITE_URL}/results` },
};

async function getPageCopy() {
  try {
    await connectDB();
    const section = await HomepageSection.findOne({ sectionKey: 'before_after' } as any).lean() as any;
    const data = section?.data ?? HOMEPAGE_DEFAULTS.before_after?.data ?? {};
    return {
      headline: data.headline ?? 'Real Results, Real Confidence',
      subheadline: data.subheadline ?? 'Visible improvements that our patients are thrilled about.',
      stats: data.stats ?? HOMEPAGE_DEFAULTS.before_after?.data?.stats ?? [],
    };
  } catch {
    return { headline: 'Real Results, Real Confidence', subheadline: '', stats: [] };
  }
}

const getPairs = unstable_cache(
  async () => {
    try {
      await connectDB();
      const results = await (Result as any)
        .find({ active: true })
        .sort({ order: 1, createdAt: -1 })
        .lean();
      return JSON.parse(JSON.stringify(results));
    } catch { return []; }
  },
  ['public-results'],
  { revalidate: 60, tags: ['results'] }
);

export default async function ResultsPage() {
  const [{ headline, subheadline, stats }, pairs] = await Promise.all([getPageCopy(), getPairs()]);
  return <ResultsClient pairs={pairs} headline={headline} subheadline={subheadline} stats={stats} />;
}
