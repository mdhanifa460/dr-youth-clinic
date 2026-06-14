import { MetadataRoute } from 'next';
import { locations } from '@/app/data/locations';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://dryouthclinic.co.in';

export default function sitemap(): MetadataRoute.Sitemap {
  const locationUrls = Object.keys(locations).map((location) => ({
    url: `${SITE_URL}/${location}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${SITE_URL}/book`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
    ...locationUrls,
  ];
}
