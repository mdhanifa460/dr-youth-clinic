// Banner Management — shared types + template registry. Mirrors the
// existing Content Block Builder's registry pattern (app/lib/contentBlocks/types.ts:
// ContentBlockTypeDef[] + a switch-based renderer) so "banner template type"
// is registered/extended the same way "content block type" already is.

import type {
  SplashAnimationStyle,
  SplashSoundEffect,
  SplashFrequency,
} from "@/app/lib/banners/popupOptions";

export type BannerTemplateType =
  | "premium-hero"
  | "offer"
  | "before-after"
  | "service"
  | "doctor"
  | "clinic-experience"
  | "glass-hero"
  // Full-bleed background image (not the split text-left/image-right
  // layout every other template but "before-after" uses) — added
  // specifically so Offer banners have a full-image option, not just the
  // existing right-aligned circular image.
  | "full-image"
  // Image-only poster: the designed artwork (text baked in) is the whole
  // banner, in a rounded card — no text overlay, whole card is the link.
  | "poster"
  // Full-viewport "credential spotlight" — a real accreditation/award
  // document or certificate image showcased on a dark navy background,
  // for a genuine certification claim (e.g. NABH accreditation) rather
  // than a promotional offer. Reuses the same generic headline/subtitle/
  // description/desktopImage/primaryCTA fields every template already
  // has — desktopImage IS the certificate/credential photo here — no new
  // schema fields, so it's fully covered by the existing admin form.
  | "credential"
  // Campaign Spotlight — a full-width festival or offer section shown above
  // the banner slider (never inside it) on the homepage and city pages. See
  // app/lib/banners/spotlight.ts.
  | "spotlight";

export interface CTAData {
  label: string;
  href: string;
}

export interface ImageData {
  url: string;
  publicId: string;
  focalPoint?: import("@/app/lib/media/focalPoint").FocalPoint;
}

export interface StatBadgeData {
  value: string;
  label: string;
}

export interface TrustBadgeData {
  icon: string;
  text: string;
}

export interface BannerTemplateDef {
  type: BannerTemplateType;
  label: string;
  icon: string;
  description: string;
  // Pre-fills the "Create Banner" form once a template type is picked —
  // same idea as HOMEPAGE_DEFAULTS seeding each section.
  defaultData: Record<string, any>;
}

export const BANNER_TEMPLATES: BannerTemplateDef[] = [
  {
    type: "spotlight",
    label: "Festival / Campaign Spotlight",
    icon: "🪔",
    description: "A full-width festival or offer section above the banner slider on the homepage and city pages: themed greeting, up to 6 tip or offer cards, optional fireworks with sound, optional background video. Switches itself on and off at the exact India times you set. Starts with last Diwali's content so you can reuse it.",
    defaultData: {
      headline: "Happy Diwali",
      subtitle: "Festival of lights",
      description: "Warm wishes from all of us at DR Youth Clinic. Here are five simple ways to look after your skin through the celebrations.",
      primaryCTA: { label: "Ask our dermatologists", href: "/book" },
      secondaryCTA: { label: "", href: "" },
      showOnHomepage: true,
      spotlight: {
        theme: "diwali",
        cards: [
          { label: "Test first", icon: "flower", title: "Patch-test new makeup and mehendi", body: "Try anything new on a small patch of skin a day or two before the festivities. Stop if it itches, reddens or burns." },
          { label: "Night care", icon: "moon", title: "Wash off the smoke at night", body: "Smoke, dust and festive makeup sit on your skin all evening. Cleanse gently before bed, then moisturise." },
          { label: "Hydrate", icon: "glass-water", title: "Keep sipping water", body: "Late nights, travel and sweets add up. Keep a water bottle close and rest between celebrations." },
          { label: "Sun care", icon: "sun", title: "Sunscreen for daytime errands", body: "Shopping, visits and decorating mean hours outdoors. Use a broad-spectrum sunscreen and reapply if you stay out long." },
          { label: "Quick first aid", icon: "shield-plus", title: "If a spark burns your skin", body: "Hold it under cool running water for 20 minutes. Skip ice, toothpaste and butter. See a doctor for large burns or any on the face, hands or eyes." },
        ],
        closingLine: "Wishing you a safe and bright Diwali.",
        disclaimer: "These are general tips. For advice about your own skin, talk to a dermatologist.",
        effects: { fireworks: true, sparkles: true, sound: true },
        soundLabel: "Tap for Diwali fireworks",
        // Must be ticked by whoever publishes it — never pre-approved.
        doctorReviewed: false,
        reviewedBy: "",
      },
    },
  },
  {
    type: "poster",
    label: "Poster (Image Only)",
    icon: "🎴",
    description: "The designed ad creative is the banner — upload finished artwork (headline, price, offer baked in) and it shows edge to edge in a rounded card, clickable, with no text laid over it. Best for campaign banners made in Canva/Photoshop.",
    defaultData: {
      headline: "Campaign banner",
      subtitle: "",
      description: "",
      primaryCTA: { label: "", href: "/book" },
      secondaryCTA: { label: "", href: "" },
    },
  },
  {
    type: "full-image",
    label: "Full Image",
    icon: "🖼️",
    description: "Full-bleed background image (not split text/image) with a text overlay and CTA — for offers, promotions, or any banner that should read as one photo, not a text-plus-thumbnail layout.",
    defaultData: {
      headline: "Flat 20% OFF\nThis Month Only",
      subtitle: "Limited Time Offer",
      description: "",
      primaryCTA: { label: "Claim This Offer", href: "/offers" },
      secondaryCTA: { label: "", href: "" },
      overlay: { enabled: true, style: "gradient", opacity: 0.6 },
    },
  },
  {
    type: "credential",
    label: "Credential Spotlight (Full Screen)",
    icon: "🏅",
    description: "Full-viewport dark banner spotlighting a real accreditation, certification, or award — your certificate/document photo on one side, the claim and a short highlight on the other. Only use this for a credential you can actually show — upload the real certificate image, not a stock photo.",
    defaultData: {
      // Deliberately an obvious placeholder, not a real claim — this is a
      // healthcare business; a false/unverified certification claim here
      // would be a real legal and trust problem, not just a copy nit. The
      // admin must replace this with their own real, verifiable wording
      // before publishing.
      headline: "Replace with your real accreditation\n(e.g. certifying body + what it certifies)",
      subtitle: "Since {year}",
      description: "Replace with one sentence on what this certification means for patients — why it matters, not just that you have it.",
      primaryCTA: { label: "Book Consultation", href: "/book" },
      secondaryCTA: { label: "", href: "" },
    },
  },
  {
    type: "glass-hero",
    label: "Glass Hero (Premium)",
    icon: "✨",
    description: "Glassmorphism hero — animated gradient, floating glass cards, particles, three CTAs, service chips, doctor highlight.",
    defaultData: {
      headline: "Healthy Skin.\nConfident You.",
      subtitle: "AI-Powered Assessment",
      description: "Personalised treatments, advanced technology & real results — trusted by thousands.",
      primaryCTA: { label: "Book Consultation", href: "/book" },
      secondaryCTA: { label: "Free AI Assessment", href: "/skin-quiz" },
      tertiaryCTA: { label: "WhatsApp Expert", href: "" },
      heroTheme: "aurora",
      motionIntensity: "full",
      experiencePreset: "luxury-glass",
      statBadges: [
        { value: "20+", label: "Doctors" },
        { value: "9+", label: "Years" },
        { value: "98%", label: "Satisfaction" },
      ],
      serviceChips: [
        { label: "Hair", icon: "💆", href: "/chennai/services/hair" },
        { label: "Skin", icon: "✨", href: "/chennai/services/skin" },
        { label: "Laser", icon: "⚡", href: "/chennai/services/laser" },
      ],
      assistantTeaser: { enabled: true, text: "Need help choosing a treatment?", ctaLabel: "Start Assessment", href: "/skin-quiz" },
    },
  },
  {
    type: "premium-hero",
    label: "Premium Hero",
    icon: "🏆",
    description: "Left content + right doctor/patient image, dual CTA, stat badges.",
    defaultData: {
      headline: "Transform Your\nHair & Skin Confidence",
      subtitle: "",
      description: "Advanced Aesthetic Treatments Powered by Expert Doctors",
      primaryCTA: { label: "Book Consultation", href: "/book" },
      secondaryCTA: { label: "View Results", href: "/results" },
      statBadges: [
        { value: "9+", label: "Years Experience" },
      ],
    },
  },
  {
    type: "offer",
    label: "Offer / Promotion",
    icon: "🏷️",
    description: "Limited-time offer with validity date, dark background, dual CTA.",
    defaultData: {
      headline: "Flat 20% OFF\nOn Hair Transplant",
      subtitle: "Special Limited Time Offer",
      description: "",
      primaryCTA: { label: "Grab This Offer", href: "/offers" },
      secondaryCTA: { label: "Book Now", href: "/book" },
    },
  },
  {
    type: "before-after",
    label: "Before & After",
    icon: "🔄",
    description: "Before/after compare slider with a trust message and CTA.",
    defaultData: {
      headline: "Real People\nReal Results",
      subtitle: "",
      description: "Advanced Treatments. Visible Transformation.",
      primaryCTA: { label: "View All Results", href: "/results" },
      secondaryCTA: { label: "", href: "" },
    },
  },
  {
    type: "service",
    label: "Service Highlight",
    icon: "🩺",
    description: "Service label, headline, bullet benefits, image, CTA.",
    defaultData: {
      headline: "Stimulate Natural\nHair Growth",
      subtitle: "PRP Therapy",
      description: "",
      primaryCTA: { label: "Explore PRP Therapy", href: "/book" },
      secondaryCTA: { label: "", href: "" },
      benefits: ["Strengthens Hair Roots", "Reduces Hair Fall", "Boosts Hair Density"],
    },
  },
  {
    type: "doctor",
    label: "Doctor / Expert",
    icon: "👨‍⚕️",
    description: "Doctor profile photo, name, title, achievements, CTA.",
    defaultData: {
      headline: "Dr. A. K. Sharma",
      subtitle: "Expert Care You Can Trust",
      description: "Founder & Chief Hair Transplant Surgeon",
      primaryCTA: { label: "Know More About Doctor", href: "/doctors" },
      secondaryCTA: { label: "", href: "" },
      achievements: ["9+ Years of Experience", "10,000+ Successful Surgeries", "Board Certified Surgeon"],
    },
  },
  {
    type: "clinic-experience",
    label: "Clinic Experience",
    icon: "🎬",
    description: "Clinic image or video with a play button, headline, subtext, CTA.",
    defaultData: {
      headline: "World-Class Clinic\nBuilt Around You",
      subtitle: "Take A Tour",
      description: "State-of-the-art infrastructure for your comfort & care.",
      // The video itself plays inline via the template's own play-button
      // toggle — this CTA drives a real action (booking), so it's never a
      // silently-hidden button with an empty href like the other templates'
      // "/book"-style defaults.
      primaryCTA: { label: "Book Consultation", href: "/book" },
      secondaryCTA: { label: "", href: "" },
    },
  },
];

export function getBannerTemplateDef(type: BannerTemplateType): BannerTemplateDef | undefined {
  return BANNER_TEMPLATES.find((t) => t.type === type);
}

// Plain-object shape of a Banner document as consumed by public renderers
// (i.e. after .lean()) — mirrors app/models/Banner.ts field-for-field so
// template components have one stable type to import without pulling in
// Mongoose (which is server-only) on the client.
export interface BannerDoc {
  _id: string;
  title: string;
  templateType: BannerTemplateType;
  headline: string;
  subtitle: string;
  description: string;
  desktopImage: ImageData;
  mobileImage: ImageData;
  beforeImage: ImageData;
  video: ImageData;
  overlay: { enabled: boolean; style: "dark" | "gradient"; opacity: number };
  primaryCTA: CTAData;
  secondaryCTA: CTAData;
  tertiaryCTA: CTAData;
  // Inline Lead Form — see the matching comment on app/models/Banner.ts's
  // IBanner.formEnabled.
  formEnabled: boolean;
  formCollectEmail: boolean;
  formSuccessMessage: string;
  // "Story View" — see the matching comment on IBanner.storySlides.
  storySlides: { url: string; publicId: string; type: "image" | "video"; focalPoint?: import("@/app/lib/media/focalPoint").FocalPoint }[];
  trustBadges: TrustBadgeData[];
  statBadges: StatBadgeData[];
  rating: { enabled: boolean; value: number; reviewCount: number };
  benefits?: string[];
  achievements?: string[];
  // Glass Hero-only fields — see app/models/Banner.ts for the same fields.
  heroTheme: "aurora" | "gold" | "ocean" | "violet" | "midnight";
  lottieUrl: string;
  lottiePlacement: "background" | "beside-heading" | "floating-badge";
  riveUrl?: string;
  rivePlacement?: "background" | "beside-heading" | "floating-badge";
  serviceChips: { label: string; icon: string; href: string }[];
  // doctorId is always populated by resolveBanner() into the full doctor
  // sub-document (or null) — never a raw ObjectId string on the client.
  doctorHighlight: {
    doctorId: { _id: string; name: string; title: string; photo: { url: string }; qualifications: string } | null;
    tagline: string;
  };
  assistantTeaser: { enabled: boolean; text: string; ctaLabel: string; href: string };
  motionIntensity: "full" | "reduced" | "off";
  experiencePreset?: string;
  experienceOverrides?: {
    colorThemeOverride?: "aurora" | "gold" | "ocean" | "violet" | "midnight" | null;
    glassBlur?: "none" | "md" | "xl" | null;
    glowIntensity?: "none" | "soft" | "strong" | null;
    entranceAnimation?: "none" | "fade" | "fade-rise" | null;
    idleAnimation?: "none" | "drift" | "pulse" | null;
    animationSpeed?: "slow" | "normal" | "fast" | null;
    parallax?: boolean | null;
    scrollEffects?: boolean | null;
  };
  status: "draft" | "active" | "disabled";
  priority: number;
  order: number;
  startDate: string | null;
  endDate: string | null;
  showOnHomepage: boolean;
  showOnLocationPage: boolean;
  showOnServicePage: boolean;
  showOnCategoryPage: boolean;
  showOnLandingPage: boolean;
  // Flash Offer Popup — used to require showOnHomepage specifically; now
  // works on any enabled "Where to Show" surface. Shows this banner as an
  // auto-dismissing modal on page load, in addition to its normal inline
  // placement by default (see splashAlsoInRotation) rather than a static
  // section the visitor has to scroll to. See HomepageOfferSplash.tsx and
  // app/(public)/page.tsx's carouselBanners/splashBanner split.
  splashEnabled: boolean;
  splashAutoCloseSeconds: number;
  splashAnimationStyle: SplashAnimationStyle;
  splashSound: { enabled: boolean; effect: SplashSoundEffect };
  splashBackdrop: { blur: number; darkness: number };
  splashShowCountdown: boolean;
  splashFrequency: SplashFrequency;
  splashAlsoInRotation: boolean;
  targetLocations: string[];
  targetServices: string[];
  targetCategories: string[];
  targetLandingPages: string[];
  spotlight?: import("@/app/lib/banners/spotlight").SpotlightData;
  smartRules?: {
    daysOfWeek: number[];
    timeWindowStart: string | null;
    timeWindowEnd: string | null;
    dateRangeStart: string | null;
    dateRangeEnd: string | null;
    seasonStartMonth: number | null;
    seasonEndMonth: number | null;
    seasonalPresetOverride?: string | null;
    campaignPreset?: string | null;
  };
}
