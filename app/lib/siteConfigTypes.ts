export interface SiteConfig {
  consultationFree: boolean;
  /** "Book Free Consultation" or "Book Consultation" */
  consultationCta: string;
  /** "Free Consult" or "Consultation" (short badge label) */
  consultationBadge: string;
  /** "free · no commitment" or "no commitment" (inline sub-text) */
  consultationSub: string;
  skinQuizFree: boolean;
  /** "✨ Free Assessment" or "✨ AI Assessment" */
  skinQuizNav: string;
  /** "Free AI Assessment" or "AI Assessment" (link text) */
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
  /** Consultation fee in ₹, shown by CostEstimator (Settings → Booking) */
  consultationFee: number;
  /** Comma-separated EMI bank partner names (Settings → Booking) */
  emiBankPartners: string;
  /** Google/patient rating (e.g. "4.7"), sourced from the homepage Stats Bar section */
  ratingValue: string;
  /** Happy-patients count (e.g. "25K+"), sourced from the homepage Stats Bar section */
  patientsCount: string;
  /** Years of experience/excellence (e.g. "22+"), sourced from the homepage Stats Bar section */
  yearsExperience: string;
}

export const SITE_CONFIG_DEFAULTS: SiteConfig = {
  consultationFree: true,
  consultationCta: 'Book Free Consultation',
  consultationBadge: 'Free Consult',
  consultationSub: 'Free · No Commitment',
  skinQuizFree: true,
  skinQuizNav: '✨ Free Assessment',
  skinQuizLabel: 'Free AI Assessment',
  publicPhone: '',
  publicWhatsApp: '',
  publicEmail: '',
  instagramUrl: '',
  facebookUrl:  '',
  youtubeUrl:   '',
  consultationFee: 500,
  emiBankPartners: 'HDFC, ICICI, Axis Bank',
  ratingValue: '4.9',
  patientsCount: '25K+',
  yearsExperience: '22+',
};
