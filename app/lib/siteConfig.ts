import { cache } from 'react';
import { connectDB } from './mongodb';
import { getSettings } from '@/app/models/Settings';
import { HomepageSection } from '@/app/models/HomepageSection';
import { HOMEPAGE_DEFAULTS } from './homepageDefaults';
import { type SiteConfig, SITE_CONFIG_DEFAULTS } from './siteConfigTypes';

export type { SiteConfig };
export { SITE_CONFIG_DEFAULTS };

/** Pulls a stat's `value` out of the homepage Stats Bar section by matching its label, so
 * pages like /book and /offers can reuse the one place patient/rating/years stats are edited. */
function findStatValue(stats: { value: string; label: string }[], needle: string): string | undefined {
  return stats.find((s) => (s.label || '').toLowerCase().includes(needle))?.value;
}

export const getSiteConfig = cache(async (): Promise<SiteConfig> => {
  try {
    await connectDB();
    const settings = await getSettings();
    const consultationFree = settings.freeLabels?.consultationFree ?? true;
    const skinQuizFree = settings.freeLabels?.skinQuizFree ?? true;

    const statsSection = await HomepageSection.findOne({ sectionKey: 'stats' } as any).lean() as any;
    const stats: { value: string; label: string }[] =
      statsSection?.data?.stats ?? HOMEPAGE_DEFAULTS.stats?.data?.stats ?? [];
    const ratingValue = (findStatValue(stats, 'rating') || SITE_CONFIG_DEFAULTS.ratingValue).split('/')[0];
    const patientsCount = findStatValue(stats, 'patient') || SITE_CONFIG_DEFAULTS.patientsCount;
    const yearsExperience =
      findStatValue(stats, 'year') || findStatValue(stats, 'excellence') || SITE_CONFIG_DEFAULTS.yearsExperience;

    return {
      consultationFree,
      consultationCta: consultationFree ? 'Book Free Consultation' : 'Book Consultation',
      consultationBadge: consultationFree ? 'Free Consult' : 'Consultation',
      consultationSub: consultationFree ? 'Free · No Commitment' : 'No Commitment',
      skinQuizFree,
      skinQuizNav: skinQuizFree ? '✨ Free Quiz' : '✨ Quiz',
      skinQuizLabel: skinQuizFree ? 'Free Quiz' : 'Quiz',
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
