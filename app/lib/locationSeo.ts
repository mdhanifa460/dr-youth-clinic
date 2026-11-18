import type { Metadata } from 'next';
import { pageTitle, metaDescription, BRAND } from '@/app/lib/seoText';

// SEO for the city pages (/chennai, /bangalore, ...). Admin → Locations → SEO
// writes LocationContent.seo; anything left empty falls back to the template
// the page has always used, so an untouched city renders exactly as before.

export const LOCATION_TITLE_MAX = 60;
export const LOCATION_DESC_MAX = 160;
const KEYWORDS_MAX = 15;
const KEYWORD_LEN_MAX = 60;

export interface LocationSeoInput {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  ogImage?: { publicId?: string; url?: string };
  noindex?: boolean;
}

export interface CleanLocationSeo {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogImage: { publicId: string; url: string };
  noindex: boolean;
}

const tidy = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim();

/** Normalises whatever the admin form sent into the stored shape. */
export function sanitizeLocationSeo(raw: unknown): CleanLocationSeo {
  const r = (raw && typeof raw === 'object' ? raw : {}) as LocationSeoInput;
  const list = Array.isArray(r.keywords)
    ? r.keywords
    : typeof (r as any).keywords === 'string'
      ? String((r as any).keywords).split(',')
      : [];
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const k of list) {
    const t = tidy(k).slice(0, KEYWORD_LEN_MAX);
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    keywords.push(t);
    if (keywords.length >= KEYWORDS_MAX) break;
  }
  const url = tidy(r.ogImage?.url);
  return {
    metaTitle: tidy(r.metaTitle).slice(0, LOCATION_TITLE_MAX),
    metaDescription: tidy(r.metaDescription).slice(0, LOCATION_DESC_MAX),
    keywords,
    // Only an https image URL is usable as a social preview.
    ogImage: /^https:\/\//i.test(url) ? { url, publicId: tidy(r.ogImage?.publicId) } : { url: '', publicId: '' },
    noindex: r.noindex === true,
  };
}

/** The title/description the page uses when the admin left them empty. */
export function defaultLocationSeo(cityName: string, specialties: string[]) {
  return {
    title: `Skin, Hair & Aesthetic Clinic in ${cityName}`,
    description: `Skin, hair and laser treatments at DR Youth Clinic in ${cityName}: ${specialties.slice(0, 4).join(', ')}. Book your consultation today.`,
  };
}

export function buildLocationMetadata(opts: {
  cityKey: string;
  cityName: string;
  specialties: string[];
  siteUrl: string;
  heroImageUrl?: string;
  seo?: LocationSeoInput | null;
}): Metadata {
  const { cityKey, cityName, specialties, siteUrl, heroImageUrl } = opts;
  const seo = sanitizeLocationSeo(opts.seo);
  const fallback = defaultLocationSeo(cityName, specialties);
  const url = `${siteUrl}/${cityKey}`;

  const title = pageTitle(seo.metaTitle || fallback.title);
  const description = metaDescription(seo.metaDescription, fallback.description);
  // A page-level openGraph replaces the root layout's whole openGraph object,
  // images included — so the image must be set here or shares show none.
  const imageUrl = seo.ogImage.url || heroImageUrl || `${siteUrl}/og-image.jpg`;
  const socialTitle = typeof title === 'string' ? `${title} | ${BRAND}` : (title as { absolute: string }).absolute;

  return {
    title,
    description,
    ...(seo.keywords.length ? { keywords: seo.keywords } : {}),
    alternates: { canonical: url },
    ...(seo.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: BRAND,
      type: 'website',
      locale: 'en_IN',
      images: [{ url: imageUrl, alt: `${BRAND} ${cityName}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [imageUrl],
    },
  };
}
