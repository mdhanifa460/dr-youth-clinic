// Client-safe Cloudinary URL builder — no SDK import, no server-only code
// Uses NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME which is inlined at build time

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';

// ── Folder paths ──────────────────────────────────────────────────────────────
export const CLOUD_FOLDERS = {
  hero:     'dr-youth-clinic/hero',
  services: 'dr-youth-clinic/services',
  doctors:  'dr-youth-clinic/doctors',
  gallery:  'dr-youth-clinic/gallery',
  blogs:    'dr-youth-clinic/blogs',
  icons:    'dr-youth-clinic/icons',
  logo:     'dr-youth-clinic/logo',
  // Per-city sub-folders
  locationPhotos: (city: string) => `dr-youth-clinic/locations/${city}`,
  locationResults: (city: string) => `dr-youth-clinic/results/${city}`,
} as const;

// ── Upload folder helper (for admin upload calls) ─────────────────────────────
export function uploadFolder(type: keyof typeof CLOUD_FOLDERS, city?: string): string {
  const val = CLOUD_FOLDERS[type];
  if (typeof val === 'function') {
    if (!city) throw new Error(`city required for ${type}`);
    return (val as (c: string) => string)(city);
  }
  return val;
}

// ── Core URL builder ──────────────────────────────────────────────────────────
export interface CloudImgOpts {
  w?: number;
  h?: number;
  q?: 'auto' | 'auto:best' | 'auto:good' | 'auto:low' | number;
  crop?: 'fill' | 'fit' | 'limit' | 'pad' | 'thumb' | 'scale';
  gravity?: 'auto' | 'face' | 'center';
  format?: 'webp' | 'auto' | 'jpg' | 'png';
}

export function cloudImg(publicId: string, opts: CloudImgOpts = {}): string {
  if (!publicId) return '';
  const {
    w,
    h,
    q = 'auto',
    crop = 'fill',
    gravity = 'auto',
    format = 'webp',
  } = opts;

  const parts: string[] = [`f_${format}`, `q_${q}`];
  if (w || h) {
    parts.push(`c_${crop}`);
    if (gravity) parts.push(`g_${gravity}`);
    if (w) parts.push(`w_${w}`);
    if (h) parts.push(`h_${h}`);
  }

  return `https://res.cloudinary.com/${CLOUD}/image/upload/${parts.join(',')}/${publicId}`;
}

// SVG delivery — no format conversion
export function cloudSvg(publicId: string): string {
  if (!publicId) return '';
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${publicId}`;
}

// ── Preset helpers — common sizes used across the site ────────────────────────

// 16:9 hero banner (homepage / location hero)
export const cloudHero = (id: string) => cloudImg(id, { w: 1280, h: 720, crop: 'fill', gravity: 'auto' });

// Square service card thumbnail
export const cloudServiceCard = (id: string) => cloudImg(id, { w: 600, h: 600, crop: 'fill', gravity: 'auto' });

// 4:3 before/after result image
export const cloudResult = (id: string) => cloudImg(id, { w: 720, h: 540, crop: 'fill', gravity: 'face' });

// Doctor headshot (square, face-aware crop)
export const cloudDoctor = (id: string) => cloudImg(id, { w: 400, h: 400, crop: 'thumb', gravity: 'face' });

// Gallery thumbnail
export const cloudGalleryThumb = (id: string) => cloudImg(id, { w: 480, h: 360, crop: 'fill', gravity: 'auto' });

// Gallery lightbox (larger)
export const cloudGalleryFull = (id: string) => cloudImg(id, { w: 1200, h: 900, crop: 'limit' });

// Blog card thumbnail
export const cloudBlogThumb = (id: string) => cloudImg(id, { w: 640, h: 400, crop: 'fill', gravity: 'auto' });

// Logo (preserve aspect ratio)
export const cloudLogo = (id: string) => cloudImg(id, { w: 200, crop: 'limit', format: 'webp' });
