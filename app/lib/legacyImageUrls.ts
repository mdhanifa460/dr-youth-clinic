const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
export const CLOUDINARY_LOGO_URL =
  `https://res.cloudinary.com/${CLOUD}/image/upload/logo_l7n0ai.png`
// Only Cloudinary or local paths are valid image sources.
// Any URL that is not Cloudinary and not a relative/local path is stripped to ''
// so components fall back to their placeholder instead of throwing Invalid src.
const CLOUDINARY_HOST = 'res.cloudinary.com';

export function normalizeLegacyImageUrl(url: string): string {
  if (!url) return '';
  // Only process absolute HTTP URLs — pass everything else (text, relative paths) unchanged
  if (!url.startsWith('http://') && !url.startsWith('https://')) return url;
  // Allow Cloudinary URLs
  try {
    if (new URL(url).hostname === CLOUDINARY_HOST) return url;
  } catch {
    return url;
  }
  // Non-Cloudinary external URL → strip so components show their placeholder
  return '';
}

export function normalizeLegacyImageUrls<T>(value: T): T {
  if (typeof value === 'string') {
    return normalizeLegacyImageUrl(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeLegacyImageUrls(item)) as T;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      normalizeLegacyImageUrls(nested),
    ])
  ) as T;
}
