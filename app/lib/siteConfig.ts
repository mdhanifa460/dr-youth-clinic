import { cache } from 'react';
import { connectDB } from './mongodb';
import { getSettings } from '@/app/models/Settings';

export interface SiteConfig {
  consultationFree: boolean;
  /** "Book Free Consultation" or "Book Consultation" */
  consultationCta: string;
  /** "Free Consult" or "Consultation" (short badge label) */
  consultationBadge: string;
  /** "free · no commitment" or "no commitment" (inline sub-text) */
  consultationSub: string;
  skinQuizFree: boolean;
  /** "✨ Free Skin Quiz" or "✨ Skin Quiz" */
  skinQuizNav: string;
  /** "Free Skin Quiz" or "Skin Quiz" (link text) */
  skinQuizLabel: string;
}

export const SITE_CONFIG_DEFAULTS: SiteConfig = {
  consultationFree: true,
  consultationCta: 'Book Free Consultation',
  consultationBadge: 'Free Consult',
  consultationSub: 'Free · No Commitment',
  skinQuizFree: true,
  skinQuizNav: '✨ Free Skin Quiz',
  skinQuizLabel: 'Free Skin Quiz',
};

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
      skinQuizNav: skinQuizFree ? '✨ Free Skin Quiz' : '✨ Skin Quiz',
      skinQuizLabel: skinQuizFree ? 'Free Skin Quiz' : 'Skin Quiz',
    };
  } catch {
    return SITE_CONFIG_DEFAULTS;
  }
});
