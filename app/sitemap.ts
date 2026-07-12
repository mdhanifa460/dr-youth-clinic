import { MetadataRoute } from 'next';
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { Doctor } from '@/app/models/Doctor';
import { Blog } from '@/app/models/Blog';
import { LandingPage } from '@/app/models/LandingPage';
import { getServiceCities, getEffectiveSlug } from '@/app/lib/serviceSeo';

export const dynamic = 'force-dynamic';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
if (!SITE_URL) {
  console.error('[sitemap] NEXT_PUBLIC_SITE_URL is not set — sitemap URLs will be relative and ignored by Google. Set this env var in Vercel dashboard.');
}
const LOCATIONS = ['chennai', 'bangalore', 'kochi', 'coimbatore'] as const;
const SERVICE_CATEGORIES = ['skin', 'hair', 'laser'] as const;

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  // ── Core pages ──────────────────────────────────────────────────────────
  {
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1,
  },
  {
    url: `${SITE_URL}/about`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    url: `${SITE_URL}/book`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.9,
  },
  {
    url: `${SITE_URL}/blog`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  {
    url: `${SITE_URL}/faqs`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    url: `${SITE_URL}/results`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  {
    url: `${SITE_URL}/doctors`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    url: `${SITE_URL}/offers`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    url: `${SITE_URL}/privacy-policy`,
    lastModified: new Date(),
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    url: `${SITE_URL}/terms`,
    lastModified: new Date(),
    changeFrequency: 'yearly',
    priority: 0.3,
  },

  // ── City landing pages (/chennai, /bangalore …) ──────────────────────
  ...LOCATIONS.map((city) => ({
    url: `${SITE_URL}/${city}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  })),

  // ── Services listing per city (/chennai/services) ────────────────────
  ...LOCATIONS.map((city) => ({
    url: `${SITE_URL}/${city}/services`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  })),

  // ── Category pages per city (/chennai/services/skin …) ───────────────
  ...LOCATIONS.flatMap((city) =>
    SERVICE_CATEGORIES.map((cat) => ({
      url: `${SITE_URL}/${city}/services/${cat}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  ),
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    await connectDB();

    const [services, doctors, blogPosts, landingPages] = await Promise.all([
      Service.find({ status: 'active' } as any)
        .select('urlSlug location targetLocations category updatedAt locationSeo')
        .lean() as Promise<any[]>,
      Doctor.find({ active: true } as any)
        .select('_id updatedAt')
        .lean() as Promise<any[]>,
      Blog.find({ active: true } as any)
        .select('slug updatedAt')
        .lean() as Promise<any[]>,
      LandingPage.find({ status: 'published' } as any)
        .select('slug updatedAt')
        .lean() as Promise<any[]>,
    ]);

    const serviceUrls: MetadataRoute.Sitemap = services
      .filter((s) => s.location && s.category && s.urlSlug)
      // A service can show at several cities (targetLocations, or the legacy
      // 'all'), each with its own effective slug — list one URL per city it's
      // actually shown at, or Google only ever discovers/indexes it under a
      // single arbitrary location/slug combination.
      .flatMap((s) => {
        const cities = getServiceCities(s);
        return cities.map((city) => ({
          url: `${SITE_URL}/${city}/services/${s.category.toLowerCase()}/${getEffectiveSlug(s, city)}`,
          lastModified: s.updatedAt ? new Date(s.updatedAt) : new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        }));
      });

    const doctorUrls: MetadataRoute.Sitemap = doctors.map((d) => ({
      url: `${SITE_URL}/doctors/${d._id}`,
      lastModified: d.updatedAt ? new Date(d.updatedAt) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

    const blogUrls: MetadataRoute.Sitemap = blogPosts
      .filter((p) => p.slug)
      .map((p) => ({
        url: `${SITE_URL}/blog/${p.slug}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }));

    const landingPageUrls: MetadataRoute.Sitemap = landingPages
      .filter((lp) => lp.slug)
      .map((lp) => ({
        url: `${SITE_URL}/lp/${lp.slug}`,
        lastModified: lp.updatedAt ? new Date(lp.updatedAt) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));

    return [...STATIC_ROUTES, ...serviceUrls, ...doctorUrls, ...blogUrls, ...landingPageUrls];
  } catch {
    return STATIC_ROUTES;
  }
}
