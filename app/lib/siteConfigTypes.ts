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
  /** Public-facing phone number from Settings (e.g. "1800 890 9669") */
  publicPhone: string;
  /** Public-facing WhatsApp number from Settings (digits only, e.g. "919876543210") */
  publicWhatsApp: string;
  /** Public-facing email from Settings */
  publicEmail: string;
  /** Social URLs from Settings → Brand (used as fallback when homepage section links are '#') */
  instagramUrl: string;
  facebookUrl:  string;
  youtubeUrl:   string;
}

export const SITE_CONFIG_DEFAULTS: SiteConfig = {
  consultationFree: true,
  consultationCta: 'Book Free Consultation',
  consultationBadge: 'Free Consult',
  consultationSub: 'Free · No Commitment',
  skinQuizFree: true,
  skinQuizNav: '✨ Free Quiz',
  skinQuizLabel: 'Free Quiz',
  publicPhone: '',
  publicWhatsApp: '',
  publicEmail: '',
  instagramUrl: '',
  facebookUrl:  '',
  youtubeUrl:   '',
};
