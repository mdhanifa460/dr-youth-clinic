// The title card at the top of a city page (/bangalore etc.): "Advanced Skin
// & Aesthetic Care in Bangalore", its description, buttons and look.
// Admin → Locations → Top of page writes LocationContent.hero; every empty
// field falls back to the wording the page has always used, so an untouched
// city renders exactly as before.

export type HeroStyle = 'classic' | 'image';
export type HeroOverlay = 'light' | 'medium' | 'strong';
// When an active banner exists for the city: 'replace' = banners take the
// whole slot (previous behaviour, hides this card and its address/hours
// panel); 'above' = banners show first, this card stays underneath.
export type BannerPlacement = 'replace' | 'above';

export interface LocationHeroInput {
  style?: string;
  badge?: string;
  title?: string;
  highlight?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  showCallButton?: boolean;
  trustLine?: string;
  offerText?: string;
  offerHref?: string;
  bgImage?: { publicId?: string; url?: string };
  overlay?: string;
  bannerPlacement?: string;
}

export interface CleanLocationHero {
  style: HeroStyle;
  badge: string;
  title: string;
  highlight: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  showCallButton: boolean;
  trustLine: string;
  offerText: string;
  offerHref: string;
  bgImage: { publicId: string; url: string };
  overlay: HeroOverlay;
  bannerPlacement: BannerPlacement;
}

const tidy = (s: unknown, max: number) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// Same-site paths, or http(s) links. Anything else (javascript:, data:) is dropped.
export function safeHref(raw: unknown): string {
  const s = tidy(raw, 300);
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//')) return s;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^(tel:|mailto:)/i.test(s)) return s;
  return '';
}

/** Normalises the admin form into the stored shape. */
export function sanitizeLocationHero(raw: unknown): CleanLocationHero {
  const r = (raw && typeof raw === 'object' ? raw : {}) as LocationHeroInput;
  const url = tidy(r.bgImage?.url, 500);
  return {
    style: r.style === 'image' ? 'image' : 'classic',
    badge: tidy(r.badge, 60),
    title: tidy(r.title, 80),
    highlight: tidy(r.highlight, 60),
    primaryCtaLabel: tidy(r.primaryCtaLabel, 30),
    primaryCtaHref: safeHref(r.primaryCtaHref),
    showCallButton: r.showCallButton !== false,
    trustLine: tidy(r.trustLine, 60),
    offerText: tidy(r.offerText, 90),
    offerHref: safeHref(r.offerHref),
    bgImage: /^https:\/\//i.test(url) ? { url, publicId: tidy(r.bgImage?.publicId, 200) } : { url: '', publicId: '' },
    overlay: r.overlay === 'light' || r.overlay === 'strong' ? r.overlay : 'medium',
    bannerPlacement: r.bannerPlacement === 'above' ? 'above' : 'replace',
  };
}

/** What the page actually shows: admin values, else the long-standing defaults. */
export function resolveLocationHero(raw: unknown, cityKey: string, cityName: string) {
  const h = sanitizeLocationHero(raw);
  return {
    ...h,
    // "image" needs an image; without one it would just be a dark box.
    style: (h.style === 'image' && h.bgImage.url ? 'image' : 'classic') as HeroStyle,
    badge: h.badge || `DR Youth Clinic — ${cityName}`,
    title: h.title || 'Advanced Skin & Aesthetic Care',
    highlight: h.highlight || `in ${cityName}`,
    primaryCtaLabel: h.primaryCtaLabel || 'Book Consultation',
    primaryCtaHref: h.primaryCtaHref || `/book?location=${cityKey}`,
    trustLine: h.trustLine || '9+ Years Experience',
  };
}

export const HERO_OVERLAY_CLASS: Record<HeroOverlay, string> = {
  light: 'bg-gradient-to-r from-black/55 via-black/30 to-black/10',
  medium: 'bg-gradient-to-r from-black/70 via-black/45 to-black/20',
  strong: 'bg-gradient-to-r from-black/85 via-black/65 to-black/40',
};
