import type { Metadata } from 'next';
import { connectDB } from '@/app/lib/mongodb';
import { Blog } from '@/app/models/Blog';
import { Service } from '@/app/models/Service';
import { Video } from '@/app/models/Video';
import { getServiceCities, getEffectiveSlug } from '@/app/lib/serviceSeo';
import BlogPageClient from './BlogPageClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
export const metadata: Metadata = {
  title: 'Medical Knowledge Center | DR Youth Clinic',
  description: 'Trusted skin & hair education from DR Youth Clinic — evidence-based articles, treatment guides and expert insights to help you make the right decisions.',
  alternates: { canonical: `${SITE_URL}/blog` },
};

async function getPosts() {
  try {
    await connectDB();
    const posts = await Blog.find({ active: true } as any)
      .sort({ featured: -1, publishedAt: -1 })
      .populate('reviewedByDoctorId', 'name title photo')
      .lean();
    return JSON.parse(JSON.stringify(posts));
  } catch { return []; }
}

async function getTrendingServices() {
  try {
    await connectDB();
    const services = await Service.find({ status: 'active' } as any)
      .sort({ publishedAt: -1 })
      .limit(6)
      .lean();
    return services.map((s: any) => {
      const city = getServiceCities(s)[0] || 'chennai';
      const slug = getEffectiveSlug(s, city);
      return {
        _id: String(s._id),
        name: s.name,
        category: s.category,
        heroDescription: s.heroDescription || '',
        heroImage: s.heroImage || null,
        href: `/${city}/services/${(s.category || '').toLowerCase()}/${slug}`,
      };
    });
  } catch { return []; }
}

async function getVideos() {
  try {
    await connectDB();
    const videos = await Video.find({ status: 'published' } as any)
      .sort({ featured: -1, displayOrder: 1, createdAt: -1 })
      .limit(9)
      .populate('doctor', 'name')
      .lean();
    return JSON.parse(JSON.stringify(videos));
  } catch { return []; }
}

export default async function BlogPage() {
  const [posts, trendingServices, videos] = await Promise.all([
    getPosts(),
    getTrendingServices(),
    getVideos(),
  ]);

  return <BlogPageClient posts={posts} trendingServices={trendingServices} videos={videos} />;
}
