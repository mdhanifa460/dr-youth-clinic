import { cache } from 'react';
import { connectDB } from './mongodb';
import { getSettings } from '@/app/models/Settings';
import { type SiteConfig, SITE_CONFIG_DEFAULTS } from './siteConfigTypes';

export type { SiteConfig };
export { SITE_CONFIG_DEFAULTS };

export const getSiteConfig = cache(async (): Promise<SiteConfig> => {
  try {
    await connectDB();
    const settings = await getSettings();
    const consultationFree = settings.freeLabels?.consultationFree ?? true;
    const skinQuizFree = settings.freeLabels?.skinQuizFree ?? true;
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
    };
  } catch {
    return SITE_CONFIG_DEFAULTS;
  }
});
