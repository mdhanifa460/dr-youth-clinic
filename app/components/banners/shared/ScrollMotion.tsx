"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

// Only ever mounted when a preset/override actually enables parallax or
// scrollEffects (GlassHeroBanner.tsx conditionally renders these) — for
// the majority of presets (parallax:false, scrollEffects:false) neither
// component exists in the tree, so this file's framer-motion scroll hooks
// never run. framer-motion itself is already a zero-marginal-cost
// dependency here (AnimatedBannerWrapper.tsx already loads it on every
// page with any banner), so this adds no new bundle weight — see Task 8/9
// of the Experience Engine design doc.
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);
  return reduced;
}

// Wraps the hero's background image/video layer — translates it slightly
// slower than the foreground as the visitor scrolls past, the classic
// parallax cue. Bounded to a small pixel range so it reads as "premium
// depth," never as content drifting out of place.
export function ParallaxBackground({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 48]);

  return (
    <motion.div ref={ref} style={{ y }} className="absolute inset-0">
      {children}
    </motion.div>
  );
}

// Wraps the glass card — gently fades/scales it down as it scrolls toward
// the top of the viewport, so the hero feels like it settles rather than
// abruptly cutting off when the visitor starts reading the next section.
export function ScrollFadeCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 0.85]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 0.97]);

  return (
    <motion.div ref={ref} style={{ opacity, scale }} className={className}>
      {children}
    </motion.div>
  );
}
