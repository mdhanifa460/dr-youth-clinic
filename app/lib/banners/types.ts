// Banner Management — shared types + template registry. Mirrors the
// existing Content Block Builder's registry pattern (app/lib/contentBlocks/types.ts:
// ContentBlockTypeDef[] + a switch-based renderer) so "banner template type"
// is registered/extended the same way "content block type" already is.

export type BannerTemplateType =
  | "premium-hero"
  | "offer"
  | "before-after"
  | "service"
  | "doctor"
  | "clinic-experience";

export interface CTAData {
  label: string;
  href: string;
}

export interface ImageData {
  url: string;
  publicId: string;
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
        { value: "20+", label: "Years Experience" },
        { value: "15,000+", label: "Happy Patients" },
        { value: "4.8/5", label: "Google Rating" },
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
      achievements: ["20+ Years of Experience", "10,000+ Successful Surgeries", "Board Certified Surgeon"],
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
  trustBadges: TrustBadgeData[];
  statBadges: StatBadgeData[];
  rating: { enabled: boolean; value: number; reviewCount: number };
  benefits?: string[];
  achievements?: string[];
  status: "draft" | "active" | "disabled";
  priority: number;
  order: number;
  startDate: string | null;
  endDate: string | null;
  showOnHomepage: boolean;
  showOnLocationPage: boolean;
  showOnServicePage: boolean;
  targetLocations: string[];
  targetServices: string[];
  smartRules?: {
    daysOfWeek: number[];
    timeWindowStart: string | null;
    timeWindowEnd: string | null;
    dateRangeStart: string | null;
    dateRangeEnd: string | null;
  };
}
