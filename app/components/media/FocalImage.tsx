'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cloudImgFocal } from '@/app/lib/cloudinary-url';
import { focalPointToObjectPosition, type FocalPoint } from '@/app/lib/media/focalPoint';

export interface FocalImageSource {
  url: string;
  publicId?: string;
  focalPoint?: FocalPoint;
}

// The one shared image-rendering component the redesign standardizes on.
// Every usage enforces exactly one aspect ratio (no shifting across
// breakpoints, unlike the old fixed-pixel-height containers) and crops
// around the image's stored focal point two ways at once: server-side via
// Cloudinary gravity (real bytes saved, real face-detection when
// mode:'face') when a publicId is available, and always via CSS
// object-position as the browser-side floor — so even a non-Cloudinary
// source (e.g. a YouTube thumbnail URL with no publicId) still gets a
// sensible crop.
export default function FocalImage({
  image,
  aspectRatio,
  sizes,
  alt,
  className = '',
  imgClassName = '',
  priority = false,
  fallbackEmoji = '🖼️',
  sourceWidth = 1200,
  children,
}: {
  image?: FocalImageSource | null;
  aspectRatio: string; // e.g. '4/5', '16/9', '1/1', '3/2'
  sizes: string;
  alt: string;
  className?: string;
  // Extra classes merged onto the <Image> itself (e.g. a hover-zoom
  // transition) — `object-cover` always stays, this only adds to it.
  imgClassName?: string;
  priority?: boolean;
  fallbackEmoji?: string;
  // Baseline width requested from Cloudinary before next/image's own
  // responsive pipeline downscales further per-viewport. Override for
  // components that render unusually large (e.g. a full-bleed hero).
  sourceWidth?: number;
  // Overlay content stacked on top of the image inside the same cropped
  // container — gradient overlays, location badges, etc.
  children?: React.ReactNode;
}) {
  const objectPosition = focalPointToObjectPosition(image?.focalPoint);

  const [rw, rh] = aspectRatio.split('/').map(Number);
  const targetHeight = Math.round((sourceWidth * rh) / rw);
  const src = image?.publicId
    ? cloudImgFocal(image.publicId, { w: sourceWidth, h: targetHeight, focalPoint: image.focalPoint })
    : image?.url;

  // A missing `src` was already handled below (empty string/undefined), but
  // a URL that's PRESENT and still fails to load (a stale/deleted Cloudinary
  // asset — confirmed happening live: two published blog posts' cover
  // images 404 at Cloudinary right now, still real, on published content)
  // rendered the browser's native broken-image icon instead, with its alt
  // text overlapping any `children` overlay (a category badge, in the blog
  // grid's case) absolutely positioned assuming the image actually painted.
  // `onError` catches that runtime failure the same way a missing `src`
  // already degrades — same gradient+emoji placeholder either way.
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio }}>
      {!showFallback ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={`object-cover ${imgClassName}`}
          style={{ objectPosition }}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-4xl bg-gradient-to-br from-[#e8eff7] to-[#c5d9ef]">
          {fallbackEmoji}
        </div>
      )}
      {children}
    </div>
  );
}
