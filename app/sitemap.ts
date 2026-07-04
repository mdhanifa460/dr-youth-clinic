import { MetadataRoute } from 'next';
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { Doctor } from '@/app/models/Doctor';

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

    const services = await Service.find({ status: 'active' } as any)
      .select('urlSlug location category updatedAt')
      .lean() as any[];

    // Fetch doctors to expose individual profile pages if needed in future
    // (imported now so the model is registered and available for later use)
    void Doctor;

    const serviceUrls: MetadataRoute.Sitemap = services
      .filter((s) => s.location && s.category && s.urlSlug)
      .map((s) => ({
        url: `${SITE_URL}/${s.location}/services/${s.category.toLowerCase()}/${s.urlSlug}`,
        lastModified: s.updatedAt ? new Date(s.updatedAt) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));

    return [...STATIC_ROUTES, ...serviceUrls];
  } catch {
    // DB unavailable (e.g. during static generation) — return static routes only
    return STATIC_ROUTES;
  }
}
