import { Metadata } from 'next';
import { connectDB } from '@/app/lib/mongodb';
import { HomepageSection } from '@/app/models/HomepageSection';
import { HOMEPAGE_DEFAULTS } from '@/app/lib/homepageDefaults';
import ResultsClient from './ResultsClient';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Before & After Results | DR Youth Clinic',
  description: 'See real patient transformation results — skin, hair, laser and more at DR Youth Clinic.',
};

async function getPairs() {
  try {
    await connectDB();
    const section = await HomepageSection.findOne({ sectionKey: 'before_after' }).lean() as any;
    const data = section?.data ?? HOMEPAGE_DEFAULTS.before_after?.data ?? {};
    return {
      pairs: data.pairs ?? [],
      headline: data.headline ?? 'Real Results, Real Confidence',
      subheadline: data.subheadline ?? 'Visible improvements that our patients are thrilled about.',
    };
  } catch {
    return { pairs: [], headline: 'Real Results, Real Confidence', subheadline: '' };
  }
}

export default async function ResultsPage() {
  const { pairs, headline, subheadline } = await getPairs();
  return <ResultsClient pairs={pairs} headline={headline} subheadline={subheadline} />;
}
