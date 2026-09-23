'use client';

import { useState } from 'react';
import Image from 'next/image';

// Same onError-fallback fix as FocalImage.tsx, for the handful of spots
// (blog detail hero, GlassHeroBanner background) that render a full-bleed
// `fill` image with NO fixed aspect ratio by design (a cinematic hero, not
// a cropped card — see blogDetailShared.tsx's own comment) so they can't
// just reuse FocalImage, which requires one. Confirmed live: a blog post
// whose cover image 404s at Cloudinary showed the browser's native
// broken-image icon + alt text at the top of the hero, overlapping the
// "All Articles" link. On error, renders nothing — the section's own
// gradient/solid background (already there for the "no cover image" case)
// shows through exactly as if no image had been set at all.
export default function FillImageWithFallback(
  props: React.ComponentProps<typeof Image>
) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <Image {...props} onError={() => setFailed(true)} />;
}
