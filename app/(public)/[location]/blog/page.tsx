// Location-targeted blog listing — same page shell (BlogPageClient) as the
// generic /blog, filtered to posts an admin explicitly targeted at this
// city (Blog.targetLocations) via the isBlogAtCity/getBlogCities helpers
// (app/lib/blogSeo.ts), mirroring how /[location]/services already narrows
// Service by city. Trending services are filtered the same way (reusing
// the existing isServiceAtCity helper); videos have no location field on
// the Video model at all, so they stay unfiltered/shared — not inventing
// new architecture for a field that doesn't exist.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { Blog } from '@/app/models/Blog';
import { Service } from '@/app/models/Service';
import { Video } from '@/app/models/Video';
import '@/app/models/Doctor';
import { getServiceCities, getEffectiveSlug, isServiceAtCity } from '@/app/lib/serviceSeo';
import { locations } from '@/app/data/locations';
import BlogPageClient from '../../blog/BlogPageClient';
import { getSettings } from '@/app/models/Settings';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
export const revalidate = 300;

export function generateStaticParams() {
  return Object.keys(locations).map((location) => ({ location }));
}

export async function generateMetadata({ params }: { params: { location: string } }): Promise<Metadata> {
  const loc = locations[params.location];
  if (!loc) return {};
  return {
    title: `Medical Knowledge Center — ${loc.name}`,
    description: `Skin & hair education from DR Youth Clinic's ${loc.name} clinic — evidence-based articles, treatment guides and expert insights.`,
    alternates: { canonical: `${SITE_URL}/${params.location}/blog` },
  };
}

const getCachedLocationPosts = unstable_cache(
  async (location: string) => {
    await connectDB();
    const posts = await Blog.find({ active: true, targetLocations: location } as any)
      .sort({ featured: -1, publishedAt: -1 })
      .limit(200)
      .populate('reviewedByDoctorId', 'name title photo')
      .lean();
    return JSON.parse(JSON.stringify(posts));
  },
  ['blog-posts-by-location'],
  { revalidate: 300, tags: ['blog'] }
);
async function getPosts(location: string) {
  try { return await getCachedLocationPosts(location); } catch { return []; }
}

const getCachedTrendingServices = unstable_cache(
  async (location: string) => {
    await connectDB();
    const services = await Service.find({ status: 'active' } as any)
      .sort({ publishedAt: -1 })
      .limit(30)
      .lean();
    return services
      .filter((s: any) => isServiceAtCity(s, location))
      .slice(0, 6)
      .map((s: any) => {
        const slug = getEffectiveSlug(s, location);
        return {
          _id: String(s._id),
          name: s.name,
          category: s.category,
          heroDescription: s.heroDescription || '',
          heroImage: s.heroImage || null,
          href: `/${location}/services/${(s.category || '').toLowerCase()}/${slug}`,
        };
      });
  },
  ['blog-trending-services-by-location'],
  { revalidate: 300, tags: ['services'] }
);
async function getTrendingServices(location: string) {
  try { return await getCachedTrendingServices(location); } catch { return []; }
}

const getCachedBlogVideos = unstable_cache(
  async () => {
    await connectDB();
    const videos = await Video.find({ status: 'published' } as any)
      .sort({ featured: -1, displayOrder: 1, createdAt: -1 })
      .limit(9)
      .populate('doctor', 'name')
      .lean();
    return JSON.parse(JSON.stringify(videos));
  },
  ['blog-videos'],
  { revalidate: 300, tags: ['videos'] }
);
async function getVideos() {
  try { return await getCachedBlogVideos(); } catch { return []; }
}

async function getBlogPostsPerPage() {
  try {
    await connectDB();
    const settings = await getSettings();
    return settings.content?.blogPostsPerPage ?? 9;
  } catch { return 9; }
}

export default async function LocationBlogPage({ params }: { params: { location: string } }) {
  if (!locations[params.location]) notFound();

  const [posts, trendingServices, videos, postsPerPage] = await Promise.all([
    getPosts(params.location),
    getTrendingServices(params.location),
    getVideos(),
    getBlogPostsPerPage(),
  ]);

  return (
    <BlogPageClient
      posts={posts}
      trendingServices={trendingServices}
      videos={videos}
      postsPerPage={postsPerPage}
      basePath={`/${params.location}/blog`}
    />
  );
}
