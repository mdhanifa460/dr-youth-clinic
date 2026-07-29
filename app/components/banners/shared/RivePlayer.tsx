"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";

// Mirrors LottiePlayer.tsx's exact discipline: no static (or next/dynamic)
// import of "@rive-app/react-canvas" anywhere in this file. That file's own
// comment documents why — a plain import, and next/dynamic() both with and
// without ssr:false, all still eagerly shipped the full dependency on
// every homepage load in this exact codebase, regardless of whether any
// banner actually used it. A runtime `import()` inside this effect is
// genuinely deferred until this component mounts. Rive's own WASM binary
// (~1.9MB, heavier than lottie-web's ~300KB JS) makes this even more
// important to get right than it was for Lottie — re-verify with a real
// network trace (page.on('request') for a chunk containing "rive") if this
// ever regresses.
export function RivePlayer({ url, className }: { url: string; className?: string }) {
  const [RiveComp, setRiveComp] = useState<ComponentType<any> | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@rive-app/react-canvas")
      .then((mod) => {
        if (cancelled) return;
        setRiveComp(() => mod.default);
      })
      .catch(() => {
        // A failed chunk fetch (or an unreachable .riv URL, surfaced by the
        // Rive runtime itself once mounted) should never break the hero
        // around it — just render nothing, same contract as LottiePlayer.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!RiveComp || !url) return null;
  return <RiveComp src={url} className={className} autoplay />;
}

export default RivePlayer;
