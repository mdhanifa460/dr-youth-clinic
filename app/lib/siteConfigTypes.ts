export interface SiteConfig {
  consultationFree: boolean;
  /** "Book Free Consultation" or "Book Consultation" */
  consultationCta: string;
  /** "Free Consult" or "Consultation" (short badge label) */
  consultationBadge: string;
  /** "free · no commitment" or "no commitment" (inline sub-text) */
  consultationSub: string;
  skinQuizFree: boolean;
  /** "✨ Free Clinical Intake" or "✨ Clinical Intake" */
  skinQuizNav: string;
  /** "Free Clinical Intake" or "Clinical Intake" (link text) */
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
  /** Site logo from Settings → Brand. Empty string = not set — every consumer (Navbar,
   *  Footer, landing-page templates) falls back to its own default asset when empty,
   *  so an unconfigured clinic looks exactly as it did before this field existed. */
  logoUrl: string;
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
  /** Whether to show the price pill on service listing/category cards (Settings → Display) */
  showPriceOnCards: boolean;
  /** Whether to show the duration pill on service listing/category cards (Settings → Display) */
  showDurationOnCards: boolean;
  /** How many related services show per page of the Related Treatments pager on a service detail page (Settings → Display) */
  relatedServicesCount: number;
  /** Whether to render the before/after image gallery on service detail pages (Settings → Display) */
  showBeforeAfterOnPublic: boolean;
  /** Schema.org @type used for the clinic entity in structured data (Settings → Content) */
  schemaType: string;
  /** Fallback byline shown when a blog post has no author set (Settings → Content) */
  defaultAuthorName: string;
  /** Milliseconds each slide shows before auto-advancing — shared by every multi-slide
   *  carousel site-wide (homepage hero, admin-managed promo banners) (Settings → Display) */
  carouselIntervalMs: number;
  /** Services Hub page (/[location]/services) hero headline, e.g. "Clinical" (Settings → Content) */
  servicesHubHeadline: string;
  /** Accent-colored second line of the headline, e.g. "Excellence." (Settings → Content) */
  servicesHubHeadlineAccent: string;
  /** Hero subtext template — {count} and {city} placeholders filled in at render time (Settings → Content) */
  servicesHubDescription: string;
}

export const SITE_CONFIG_DEFAULTS: SiteConfig = {
  consultationFree: true,
  consultationCta: 'Book Free Consultation',
  consultationBadge: 'Free Consult',
  consultationSub: 'Free · No Commitment',
  skinQuizFree: true,
  skinQuizNav: '✨ Free Clinical Intake',
  skinQuizLabel: 'Free Clinical Intake',
  publicPhone: '',
  publicWhatsApp: '',
  publicEmail: '',
  instagramUrl: '',
  facebookUrl:  '',
  youtubeUrl:   '',
  logoUrl: '',
  consultationFee: 500,
  emiBankPartners: 'HDFC, ICICI, Axis Bank',
  ratingValue: '4.9',
  patientsCount: '25K+',
  yearsExperience: '22+',
  showPriceOnCards: true,
  showDurationOnCards: true,
  relatedServicesCount: 3,
  showBeforeAfterOnPublic: true,
  schemaType: 'MedicalClinic',
  defaultAuthorName: 'DR Youth Clinic',
  carouselIntervalMs: 5000,
  servicesHubHeadline: 'Clinical',
  servicesHubHeadlineAccent: 'Excellence.',
  servicesHubDescription: '{count} across dermatology, hair restoration, and precision laser — all in {city}.',
};
