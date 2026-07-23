import { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { Story } from '@/app/models/Story';
import { StoryType } from '@/app/models/StoryType';
import WebStoriesClient from './WebStoriesClient';

export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
export const metadata: Metadata = {
  title: 'Web Stories',
  description: 'Quick, visual stories on treatments, transformations, offers, and patient journeys at DR Youth Clinic.',
  alternates: { canonical: `${SITE_URL}/web-stories` },
};

const getStories = unstable_cache(
  async () => {
    try {
      await connectDB();
      const [stories, types] = await Promise.all([
        (Story as any)
          .find({ status: 'published' })
          .select('-slides')
          .populate('storyType', 'name icon slug')
          .sort({ order: 1, publishedAt: -1 })
          .lean(),
        (StoryType as any).find({ active: true }).sort({ order: 1 }).lean(),
      ]);
      return { stories: JSON.parse(JSON.stringify(stories)), types: JSON.parse(JSON.stringify(types)) };
    } catch {
      return { stories: [], types: [] };
    }
  },
  ['public-web-stories'],
  { revalidate: 60, tags: ['stories'] }
);

export default async function WebStoriesPage() {
  const { stories, types } = await getStories();
  return <WebStoriesClient stories={stories} types={types} />;
}
