// Canonical category definitions shared between the real category listing
// pages (app/(public)/[location]/services/[category]/page.tsx) and the
// homepage's category showcase (app/components/homepage/ServicesCards.tsx)
// — extracted here so both stay in sync instead of maintaining two copies.

// URL slug -> DB `Service.category` value
export const CATEGORY_MAP: Record<string, string> = {
  skin: 'Skin',
  hair: 'Hair',
  laser: 'Laser',
  other: 'Other',
};

export interface CategoryMeta {
  label: string;
  tagline: string;
  description: string;
  icon: string;
  heroGrad: string;
  accentText: string;
  pillBg: string;
  pillText: string;
  badgeBg: string;
  badgeText: string;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  skin: {
    label: 'Skin & Aesthetics',
    tagline: 'Radiance · Restored',
    description:
      'Evidence-based dermatological treatments for every skin concern — from acne management and pigmentation correction to anti-ageing and deep hydration. Our specialists tailor every protocol to your unique skin biology.',
    icon: '✨',
    heroGrad: 'from-[#7c1d0a] via-[#a63c1c] to-[#c96a4e]',
    accentText: 'text-[#f9c3ae]',
    pillBg: 'bg-[#f9c3ae]/20',
    pillText: 'text-[#f9c3ae]',
    badgeBg: 'bg-[#7c1d0a]',
    badgeText: 'text-[#f9c3ae]',
  },
  hair: {
    label: 'Hair Restoration',
    tagline: 'Volume · Confidence',
    description:
      'Comprehensive hair and scalp solutions — PRP therapy, GFC, transplants, and medical-grade treatments for hair loss, thinning, and alopecia. Clinically proven protocols with lasting results.',
    icon: '🌿',
    heroGrad: 'from-[#6b2d00] via-[#9a4109] to-[#d97706]',
    accentText: 'text-[#fcd34d]',
    pillBg: 'bg-[#fcd34d]/20',
    pillText: 'text-[#fcd34d]',
    badgeBg: 'bg-[#78350f]',
    badgeText: 'text-[#fcd34d]',
  },
  laser: {
    label: 'Laser Precision',
    tagline: 'Science · Skin',
    description:
      'FDA-approved laser technology for permanent hair reduction, pigmentation, acne scarring, and full skin rejuvenation. Precision targeting with minimal downtime and maximum results.',
    icon: '⚡',
    heroGrad: 'from-[#0B2560] via-[#1e3a8a] to-[#3b82f6]',
    accentText: 'text-[#93c5fd]',
    pillBg: 'bg-[#93c5fd]/20',
    pillText: 'text-[#93c5fd]',
    badgeBg: 'bg-[#1e3a8a]',
    badgeText: 'text-[#93c5fd]',
  },
  other: {
    label: 'Specialist Care',
    tagline: 'Tailored · Precise',
    description:
      'Specialised aesthetic and medical wellness procedures designed for unique concerns. Our experts craft a personalised plan for every patient with attention to safety, outcomes, and comfort.',
    icon: '🏥',
    heroGrad: 'from-[#052e16] via-[#064e3b] to-[#059669]',
    accentText: 'text-[#6ee7b7]',
    pillBg: 'bg-[#6ee7b7]/20',
    pillText: 'text-[#6ee7b7]',
    badgeBg: 'bg-[#064e3b]',
    badgeText: 'text-[#6ee7b7]',
  },
};

export const CATEGORY_SLUGS = Object.keys(CATEGORY_MAP);
