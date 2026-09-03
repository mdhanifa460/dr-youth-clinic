import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { Doctor } from '@/app/models/Doctor';
import { Blog } from '@/app/models/Blog';
import { LandingPage } from '@/app/models/LandingPage';
import { Story } from '@/app/models/Story';
import { Result } from '@/app/models/Result';
import { Video } from '@/app/models/Video';
import { Course } from '@/app/models/Course';
import { getServiceCities, getEffectiveSlug } from '@/app/lib/serviceSeo';
import { getBlogCities } from '@/app/lib/blogSeo';

// The current site's complete real-page URL inventory — extracted out of
// app/sitemap.ts (which still owns the SITE_URL prefix / MetadataRoute
// shape and is unchanged in behavior) so a second consumer, the Domain
// Migration redirect-matching engine, can enumerate "every real page on
// this site today" without duplicating this model-querying logic. This
// file returns bare paths (no domain), plus a `category`/`label` hint
// where one naturally exists — used by the matching engine, not by
// app/sitemap.ts, which ignores those two fields.
export interface SiteUrlEntry {
  path: string;
  lastModified: Date;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: number;
  category?: string;
  label?: string;
}

const LOCATIONS = ['chennai', 'bangalore', 'kochi', 'coimbatore'] as const;
const SERVICE_CATEGORIES = ['skin', 'hair', 'laser'] as const;

// Exported (not just used internally) so app/sitemap.ts's error fallback
// can render every static route even if the DB-querying part of
// getSiteUrlInventory() below fails — this function alone is pure/
// synchronous and can't be the cause of that failure.
export function staticRoutes(): SiteUrlEntry[] {
  const now = new Date();
  return [
    { path: '', lastModified: now, changeFrequency: 'daily', priority: 1 },
    { path: '/about', lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { path: '/book', lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { path: '/blog', lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { path: '/faqs', lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { path: '/results', lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { path: '/academy', lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { path: '/doctors', lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { path: '/offers', lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { path: '/web-stories', lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { path: '/privacy-policy', lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { path: '/terms', lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    ...LOCATIONS.map((city): SiteUrlEntry => ({
      path: `/${city}`, lastModified: now, changeFrequency: 'weekly', priority: 0.9, label: city,
    })),
    ...LOCATIONS.map((city): SiteUrlEntry => ({
      path: `/${city}/services`, lastModified: now, changeFrequency: 'weekly', priority: 0.8, label: `${city} services`,
    })),
    ...LOCATIONS.flatMap((city) =>
      SERVICE_CATEGORIES.map((cat): SiteUrlEntry => ({
        path: `/${city}/services/${cat}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
        category: cat,
        label: `${city} ${cat} services`,
      }))
    ),
  ];
}

export async function getSiteUrlInventory(): Promise<SiteUrlEntry[]> {
  await connectDB();

  const [services, doctors, blogPosts, landingPages, stories, results, videos, courses] = await Promise.all([
    Service.find({ status: 'active' } as any)
      .select('name urlSlug location targetLocations category updatedAt locationSeo')
      .lean() as Promise<any[]>,
    Doctor.find({ active: true } as any)
      .select('_id name updatedAt')
      .lean() as Promise<any[]>,
    Blog.find({ active: true } as any)
      .select('slug title updatedAt targetLocations')
      .lean() as Promise<any[]>,
    LandingPage.find({ status: 'published' } as any)
      .select('slug updatedAt')
      .lean() as Promise<any[]>,
    (Story as any).find({ status: 'published' })
      .select('slug updatedAt')
      .lean() as Promise<any[]>,
    (Result as any).find({ status: 'published' })
      .select('slug title updatedAt')
      .lean() as Promise<any[]>,
    (Video as any).find({ status: 'published' })
      .select('slug title updatedAt')
      .lean() as Promise<any[]>,
    (Course as any).find({ status: 'published' })
      .select('slug title updatedAt')
      .lean() as Promise<any[]>,
  ]);

  const serviceUrls: SiteUrlEntry[] = services
    .filter((s) => s.location && s.category && s.urlSlug)
    .flatMap((s) => {
      const cities = getServiceCities(s);
      return cities.map((city): SiteUrlEntry => ({
        path: `/${city}/services/${s.category.toLowerCase()}/${getEffectiveSlug(s, city)}`,
        lastModified: s.updatedAt ? new Date(s.updatedAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
        category: s.category.toLowerCase(),
        label: s.name,
      }));
    });

  const doctorUrls: SiteUrlEntry[] = doctors.map((d) => ({
    path: `/doctors/${d._id}`,
    lastModified: d.updatedAt ? new Date(d.updatedAt) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
    label: d.name,
  }));

  const blogUrls: SiteUrlEntry[] = blogPosts
    .filter((p) => p.slug)
    .map((p) => ({
      path: `/blog/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
      label: p.title,
    }));

  // Location-targeted duplicates of the same post, same reasoning as
  // serviceUrls above — one document, one URL per city it was explicitly
  // opted into via targetLocations (see app/lib/blogSeo.ts).
  const locationBlogUrls: SiteUrlEntry[] = blogPosts
    .filter((p) => p.slug)
    .flatMap((p) =>
      getBlogCities(p).map((city): SiteUrlEntry => ({
        path: `/${city}/blog/${p.slug}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        changeFrequency: 'monthly',
        priority: 0.7,
        label: p.title,
      }))
    );

  const landingPageUrls: SiteUrlEntry[] = landingPages
    .filter((lp) => lp.slug)
    .map((lp) => ({
      path: `/lp/${lp.slug}`,
      lastModified: lp.updatedAt ? new Date(lp.updatedAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

  const storyUrls: SiteUrlEntry[] = stories
    .filter((s) => s.slug)
    .map((s) => ({
      path: `/web-stories/${s.slug}`,
      lastModified: s.updatedAt ? new Date(s.updatedAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

  const resultUrls: SiteUrlEntry[] = results
    .filter((r) => r.slug)
    .map((r) => ({
      path: `/results/${r.slug}`,
      lastModified: r.updatedAt ? new Date(r.updatedAt) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
      label: r.title,
    }));

  const videoUrls: SiteUrlEntry[] = videos
    .filter((v) => v.slug)
    .map((v) => ({
      path: `/academy/${v.slug}`,
      lastModified: v.updatedAt ? new Date(v.updatedAt) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
      label: v.title,
    }));

  const courseUrls: SiteUrlEntry[] = courses
    .filter((c) => c.slug)
    .map((c) => ({
      path: `/academy/courses/${c.slug}`,
      lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
      label: c.title,
    }));

  return [
    ...staticRoutes(),
    ...serviceUrls,
    ...doctorUrls,
    ...blogUrls,
    ...locationBlogUrls,
    ...landingPageUrls,
    ...storyUrls,
    ...resultUrls,
    ...videoUrls,
    ...courseUrls,
  ];
}
