"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";

// No static (or next/dynamic) import of "lottie-react" anywhere in this
// file — verified via a real network trace that a plain import, and
// next/dynamic() both with and without ssr:false, all still shipped the
// full ~300KB lottie-web engine on every homepage load regardless of
// whether any banner actually used it (Next 14's App Router eagerly
// preloads a route's whole client-reference-manifest, which a Server
// Component's conditional render doesn't exclude a chunk from). A plain
// runtime `import()` call inside this effect is genuinely deferred by the
// browser/bundler until this component actually mounts — it isn't part of
// any framework-level chunking heuristic, so it can't be silently
// re-broken by an unrelated Next.js version/behavior change the way the
// last three attempts were. Re-verify with a network trace
// (page.on('request') for a chunk containing "lottie-web") if this ever
// regresses.
export function LottiePlayer({ url, className }: { url: string; className?: string }) {
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [LottieComp, setLottieComp] = useState<ComponentType<any> | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([import("lottie-react"), fetch(url).then((res) => res.json())])
      .then(([mod, data]) => {
        if (cancelled) return;
        setLottieComp(mod.default);
        setAnimationData(data);
      })
      .catch(() => {
        // A broken/unreachable Lottie URL, or a failed chunk fetch, should
        // never break the hero around it — just render nothing.
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!LottieComp || !animationData) return null;
  return <LottieComp animationData={animationData} loop autoplay className={className} />;
}

export default LottiePlayer;
