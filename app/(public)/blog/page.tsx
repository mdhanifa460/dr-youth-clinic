import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { Blog } from '@/app/models/Blog';
import { Service } from '@/app/models/Service';
import { Video } from '@/app/models/Video';
// Registers Doctor with Mongoose for the .populate('doctor') /
// .populate('reviewedByDoctorId') calls below — see the note in
// app/api/admin/results/route.ts for why this import can't be dropped.
import '@/app/models/Doctor';
import { getServiceCities, getEffectiveSlug } from '@/app/lib/serviceSeo';
import BlogPageClient from './BlogPageClient';
import { getSettings } from '@/app/models/Settings';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
export const metadata: Metadata = {
  title: 'Medical Knowledge Center',
  description: 'Trusted skin & hair education from DR Youth Clinic — evidence-based articles, treatment guides and expert insights to help you make the right decisions.',
  alternates: { canonical: `${SITE_URL}/blog` },
};

// This page previously had no `revalidate` export and no cache wrapper on
// any of its three queries — every single visit ran three fresh, uncached
// Mongo round trips, and getPosts() had no .limit() at all (fetched the
// entire blog). unstable_cache here matches the pattern already used
// throughout app/(public)/page.tsx (getCachedBlogPosts, etc.) and
// app/lib/siteConfig.ts — one real fetch per 5-minute window, not one per
// visitor. Tags reuse 'services'/'videos' where the admin write routes
// already (or now also) call revalidateTag, so an edit shows up immediately
// rather than waiting out the window.
export const revalidate = 300;

const getCachedPosts = unstable_cache(
  async () => {
    await connectDB();
    const posts = await Blog.find({ active: true } as any)
      .sort({ featured: -1, publishedAt: -1 })
      .limit(200) // admin-authored content, not user-generated — a generous cap, not a real pagination limit (BlogPageClient paginates this list client-side)
      .populate('reviewedByDoctorId', 'name title photo')
      .lean();
    return JSON.parse(JSON.stringify(posts));
  },
  ['blog-posts'],
  { revalidate: 300, tags: ['blog'] }
);
async function getPosts() {
  try { return await getCachedPosts(); } catch { return []; }
}

const getCachedTrendingServices = unstable_cache(
  async () => {
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
  },
  ['blog-trending-services'],
  { revalidate: 300, tags: ['services'] }
);
async function getTrendingServices() {
  try { return await getCachedTrendingServices(); } catch { return []; }
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

// getSettings() is already unstable_cache-wrapped internally (see
// app/models/Settings.ts) — no additional wrapper needed here.
async function getBlogPostsPerPage() {
  try {
    await connectDB();
    const settings = await getSettings();
    return settings.content?.blogPostsPerPage ?? 9;
  } catch { return 9; }
}

export default async function BlogPage() {
  const [posts, trendingServices, videos, postsPerPage] = await Promise.all([
    getPosts(),
    getTrendingServices(),
    getVideos(),
    getBlogPostsPerPage(),
  ]);

  return <BlogPageClient posts={posts} trendingServices={trendingServices} videos={videos} postsPerPage={postsPerPage} />;
}
