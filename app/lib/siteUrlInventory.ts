import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { Doctor } from '@/app/models/Doctor';
import { Blog } from '@/app/models/Blog';
import { LandingPage } from '@/app/models/LandingPage';
import { Story } from '@/app/models/Story';
import { Result } from '@/app/models/Result';
import { Video } from '@/app/models/Video';
import { Course } from '@/app/models/Course';
import { getServiceCities, getEffectiveSlug, isCityPageIndexable } from '@/app/lib/serviceSeo';
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
  // Undefined = no honest modification date (static/aggregate pages). Emitting
  // "now" on every request teaches Google to ignore lastmod entirely.
  lastModified?: Date;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: number;
  category?: string;
  label?: string;
  // true = the page declares a different canonical (or is noindex), so it
  // must not be submitted in the sitemap.
  excludeFromSitemap?: boolean;
}

const LOCATIONS = ['chennai', 'bangalore', 'kochi', 'coimbatore'] as const;
const SERVICE_CATEGORIES = ['skin', 'hair', 'laser'] as const;

// Exported (not just used internally) so app/sitemap.ts's error fallback
// can render every static route even if the DB-querying part of
// getSiteUrlInventory() below fails — this function alone is pure/
// synchronous and can't be the cause of that failure.
export function staticRoutes(): SiteUrlEntry[] {
  return [
    { path: '', changeFrequency: 'daily', priority: 1 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/book', changeFrequency: 'monthly', priority: 0.9 },
    { path: '/blog', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/faqs', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/results', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/academy', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/doctors', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/offers', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/web-stories', changeFrequency: 'daily', priority: 0.8 },
    { path: '/privacy-policy', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
    ...LOCATIONS.map((city): SiteUrlEntry => ({
      path: `/${city}`, changeFrequency: 'weekly', priority: 0.9, label: city,
    })),
    ...LOCATIONS.map((city): SiteUrlEntry => ({
      path: `/${city}/services`, changeFrequency: 'weekly', priority: 0.8, label: `${city} services`,
    })),
    ...LOCATIONS.flatMap((city) =>
      SERVICE_CATEGORIES.map((cat): SiteUrlEntry => ({
        path: `/${city}/services/${cat}`,
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
      .select('slug title updatedAt targetLocations canonicalUrl')
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
        excludeFromSitemap: !isCityPageIndexable(s, city),
        lastModified: s.updatedAt ? new Date(s.updatedAt) : undefined,
        changeFrequency: 'weekly',
        priority: 0.8,
        category: s.category.toLowerCase(),
        label: s.name,
      }));
    });

  const doctorUrls: SiteUrlEntry[] = doctors.map((d) => ({
    path: `/doctors/${d._id}`,
    lastModified: d.updatedAt ? new Date(d.updatedAt) : undefined,
    changeFrequency: 'monthly',
    priority: 0.6,
    label: d.name,
  }));

  const blogUrls: SiteUrlEntry[] = blogPosts
    .filter((p) => p.slug)
    .map((p) => ({
      path: `/blog/${p.slug}`,
      excludeFromSitemap: !!p.canonicalUrl && !p.canonicalUrl.replace(/\/$/, '').endsWith(`/blog/${p.slug}`),
      lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
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
        lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
        changeFrequency: 'monthly',
        priority: 0.7,
        label: p.title,
      }))
    );

  const landingPageUrls: SiteUrlEntry[] = landingPages
    .filter((lp) => lp.slug)
    .map((lp) => ({
      path: `/lp/${lp.slug}`,
      // Landing pages are always robots noindex (app/lp/[slug]/page.tsx).
      excludeFromSitemap: true,
      lastModified: lp.updatedAt ? new Date(lp.updatedAt) : undefined,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

  const storyUrls: SiteUrlEntry[] = stories
    .filter((s) => s.slug)
    .map((s) => ({
      path: `/web-stories/${s.slug}`,
      lastModified: s.updatedAt ? new Date(s.updatedAt) : undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

  const resultUrls: SiteUrlEntry[] = results
    .filter((r) => r.slug)
    .map((r) => ({
      path: `/results/${r.slug}`,
      lastModified: r.updatedAt ? new Date(r.updatedAt) : undefined,
      changeFrequency: 'monthly',
      priority: 0.6,
      label: r.title,
    }));

  const videoUrls: SiteUrlEntry[] = videos
    .filter((v) => v.slug)
    .map((v) => ({
      path: `/academy/${v.slug}`,
      lastModified: v.updatedAt ? new Date(v.updatedAt) : undefined,
      changeFrequency: 'monthly',
      priority: 0.6,
      label: v.title,
    }));

  const courseUrls: SiteUrlEntry[] = courses
    .filter((c) => c.slug)
    .map((c) => ({
      path: `/academy/courses/${c.slug}`,
      lastModified: c.updatedAt ? new Date(c.updatedAt) : undefined,
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
