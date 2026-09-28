'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';

// Same onError-fallback fix as FocalImage.tsx, for the several spots across
// the homepage (ServicesCards, HomepageLocations, VideoReelsSection,
// WebStoriesSection, RelatedServicesPager, FounderSection) that each hand-
// rolled a `{url ? <Image ...> : <fallback />}` ternary with no error
// handling — a dead Cloudinary URL rendered the browser's native
// broken-image icon at `fill` size instead of that fallback. Confirmed live
// on BlogInsights.tsx's identical pattern: on mobile, that icon sat over
// the hamburger menu button and silently ate every tap on it.
//
// `src` is optional (unlike next/image's own prop, which requires it) so a
// caller can pass `image?.url` straight through without its own ternary —
// a falsy src renders the fallback immediately, same as a load error.
export default function ImageWithFallback({
  src,
  fallback,
  ...props
}: Omit<ImageProps, 'src'> & { src?: string | null; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <>{fallback}</>;
  return <Image {...props} src={src} onError={() => setFailed(true)} />;
}
