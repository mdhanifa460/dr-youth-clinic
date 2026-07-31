// Shared focal-point type + conversion helpers. Plain TS, no Mongoose import,
// so this can be used from client components (FocalImage, FocalPointPicker)
// and server code (Cloudinary URL builders) alike.
//
// A focal point is either one of five fixed presets, or 'manual' with an
// explicit x/y (percentage of image width/height, 0-100). Presets map
// directly onto both a CSS object-position (browser-side crop fallback,
// always applied) and a Cloudinary gravity parameter (server-side crop,
// applied only when the image is a Cloudinary asset with a publicId) — so
// the same stored value drives both mechanisms instead of two independent
// systems drifting apart, which was the actual bug in the pre-existing code.
export type FocalPointMode = 'center' | 'top' | 'top-left' | 'top-right' | 'face' | 'manual';

export interface FocalPoint {
  mode: FocalPointMode;
  // 0-100, only meaningful (and only stored) when mode === 'manual'.
  x?: number;
  y?: number;
}

export const DEFAULT_FOCAL_POINT: FocalPoint = { mode: 'center' };

export const FOCAL_POINT_PRESETS: { mode: FocalPointMode; label: string }[] = [
  { mode: 'center', label: 'Center' },
  { mode: 'top', label: 'Top' },
  { mode: 'top-left', label: 'Top Left' },
  { mode: 'top-right', label: 'Top Right' },
  { mode: 'face', label: 'Face' },
  { mode: 'manual', label: 'Manual' },
];

export function focalPointToObjectPosition(fp?: FocalPoint | null): string {
  if (!fp) return '50% 50%';
  switch (fp.mode) {
    case 'center': return '50% 50%';
    case 'top': return '50% 0%';
    case 'top-left': return '0% 0%';
    case 'top-right': return '100% 0%';
    // No real face-detection here — this is the static fallback position
    // used for browser-side object-position. The actual face-aware crop
    // comes from Cloudinary's gravity:'face' below, which does real
    // detection server-side; this CSS value only matters until that image
    // loads or for non-Cloudinary sources.
    case 'face': return '50% 22%';
    case 'manual': return `${fp.x ?? 50}% ${fp.y ?? 50}%`;
    default: return '50% 50%';
  }
}

// Cloudinary `gravity` parameter this focal point maps to. 'manual' needs
// the x/y passed as separate g_xy_center offset params (see
// app/lib/cloudinary-url.ts) rather than a plain gravity keyword.
export function focalPointToCloudinaryGravity(fp?: FocalPoint | null): string {
  if (!fp) return 'auto';
  switch (fp.mode) {
    case 'center': return 'center';
    case 'top': return 'north';
    case 'top-left': return 'north_west';
    case 'top-right': return 'north_east';
    case 'face': return 'face';
    case 'manual': return 'xy_center';
    default: return 'auto';
  }
}
