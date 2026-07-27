"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";

// Thin wrapper so GlassHeroBanner.tsx can next/dynamic-import this one file
// (ssr:false) instead of the raw lottie-react package — the entire
// lottie-web runtime only ever ships to the client when a banner actually
// has a lottieUrl set. Fetches+parses the JSON itself (this version's
// types don't expose lottie-web's `path` passthrough), caching per URL for
// the component's lifetime; renders nothing while loading/on failure
// rather than showing a broken player.
export function LottiePlayer({ url, className }: { url: string; className?: string }) {
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAnimationData(null);
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setAnimationData(data);
      })
      .catch(() => {
        // A broken/unreachable Lottie URL should never break the hero
        // around it — just render nothing.
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!animationData) return null;
  return <Lottie animationData={animationData} loop autoplay className={className} />;
}

export default LottiePlayer;
