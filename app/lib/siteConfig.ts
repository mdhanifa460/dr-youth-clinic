import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { connectDB } from './mongodb';
import { getSettings } from '@/app/models/Settings';
import { HomepageSection } from '@/app/models/HomepageSection';
import { HOMEPAGE_DEFAULTS } from './homepageDefaults';
import { type SiteConfig, SITE_CONFIG_DEFAULTS } from './siteConfigTypes';

export type { SiteConfig };
export { SITE_CONFIG_DEFAULTS };

/** Pulls a stat's `value` out of the homepage Stats Bar section by matching its label, so
 * pages like /book and /offers can reuse the one place patient/rating/years stats are edited. */
function findStatValue(stats: { value: string; label: string }[], needle: string | string[]): string | undefined {
  const needles = Array.isArray(needle) ? needle : [needle];
  return stats.find((s) => {
    const label = (s.label || '').toLowerCase();
    return needles.some((n) => label.includes(n));
  })?.value;
}

// Cached like every other HomepageSection reader (getCachedSections, getCmsFaqs, etc.) —
// getSiteConfig() itself is only request-scoped (React cache()), and is called from
// force-dynamic routes like app/lp/[slug]/page.tsx, so this needs its own persisted cache.
const getCachedStats = unstable_cache(
  async (): Promise<{ value: string; label: string }[]> => {
    await connectDB();
    const statsSection = await HomepageSection.findOne({ sectionKey: 'stats' } as any).lean() as any;
    return statsSection?.data?.stats ?? HOMEPAGE_DEFAULTS.stats?.data?.stats ?? [];
  },
  ['site-config-stats'],
  { revalidate: 300, tags: ['homepage-layout'] }
);

export const getSiteConfig = cache(async (): Promise<SiteConfig> => {
  try {
    await connectDB();
    const settings = await getSettings();
    const consultationFree = settings.freeLabels?.consultationFree ?? true;
    const skinQuizFree = settings.freeLabels?.skinQuizFree ?? true;

    const stats = await getCachedStats();
    const ratingValue = (findStatValue(stats, ['rating', 'star', 'review']) || SITE_CONFIG_DEFAULTS.ratingValue).split('/')[0];
    const patientsCount = findStatValue(stats, ['patient', 'client', 'happy']) || SITE_CONFIG_DEFAULTS.patientsCount;
    const yearsExperience =
      findStatValue(stats, ['year', 'excellence', 'experience']) || SITE_CONFIG_DEFAULTS.yearsExperience;

    return {
      consultationFree,
      consultationCta: consultationFree ? 'Book Free Consultation' : 'Book Consultation',
      consultationBadge: consultationFree ? 'Free Consult' : 'Consultation',
      consultationSub: consultationFree ? 'Free · No Commitment' : 'No Commitment',
      skinQuizFree,
      skinQuizNav: skinQuizFree ? '✨ Free Clinical Intake' : '✨ Clinical Intake',
      skinQuizLabel: skinQuizFree ? 'Free Clinical Intake' : 'Clinical Intake',
      publicPhone:    settings.contact?.publicPhone    || '',
      publicWhatsApp: settings.contact?.publicWhatsApp || '',
      publicEmail:    settings.contact?.publicEmail    || '',
      instagramUrl:   settings.brand?.instagram || '',
      facebookUrl:    settings.brand?.facebook  || '',
      youtubeUrl:     settings.brand?.youtube   || '',
      consultationFee: settings.booking?.consultationFee ?? 500,
      emiBankPartners: settings.booking?.emiBankPartners || 'HDFC, ICICI, Axis Bank',
      ratingValue,
      patientsCount,
      yearsExperience,
    };
  } catch {
    return SITE_CONFIG_DEFAULTS;
  }
});
