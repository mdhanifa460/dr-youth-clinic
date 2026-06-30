import { MetadataRoute } from 'next';
import { locations } from '@/app/data/locations';
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

const CATEGORY_KEYS = ['skin', 'hair', 'laser', 'other'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cityKeys = Object.keys(locations);

  // Pull all active service slugs from DB for individual service pages
  let serviceUrls: MetadataRoute.Sitemap = [];
  try {
    await connectDB();
    const services = await Service.find({ status: 'active' } as any)
      .select('location category urlSlug updatedAt')
      .lean() as any[];

    serviceUrls = services
      .filter((s) => s.location && s.category && s.urlSlug)
      .map((s) => ({
        url: `${SITE_URL}/${s.location}/services/${s.category.toLowerCase()}/${s.urlSlug}`,
        lastModified: s.updatedAt ? new Date(s.updatedAt) : new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }));
  } catch {
    // DB unavailable during static generation — service pages omitted this run
  }

  return [
    // ── Core pages ──────────────────────────────────────────────────────
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/book`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },

    // ── City landing pages (/chennai, /bangalore …) ──────────────────────
    ...cityKeys.map((city) => ({
      url: `${SITE_URL}/${city}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),

    // ── Services listing per city (/chennai/services) ────────────────────
    ...cityKeys.map((city) => ({
      url: `${SITE_URL}/${city}/services`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),

    // ── Category pages per city (/chennai/services/skin) ─────────────────
    ...cityKeys.flatMap((city) =>
      CATEGORY_KEYS.map((cat) => ({
        url: `${SITE_URL}/${city}/services/${cat}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.75,
      }))
    ),

    // ── Individual service pages from DB ──────────────────────────────────
    ...serviceUrls,
  ];
}
