"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import type { StatBadgeData } from "@/app/lib/banners/types";

// "15,000+" -> {prefix:"", digits:15000, suffix:"+"} so only the numeric
// part counts up; everything else (commas, "+", "%", "/5") is preserved
// verbatim around it. Falls back to rendering the raw string with no
// animation for anything that doesn't start with a number (e.g. "4.8/5"
// still matches — the regex is decimal-aware).
function parseStatValue(raw: string): { digits: number; prefix: string; suffix: string; decimals: number } | null {
  const match = raw.match(/^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  const [, prefix, numPart, suffix] = match;
  const digits = parseFloat(numPart.replace(/,/g, ""));
  if (Number.isNaN(digits)) return null;
  const decimals = numPart.includes(".") ? numPart.split(".")[1].length : 0;
  return { digits, prefix, suffix, decimals };
}

function formatCount(n: number, decimals: number, hasComma: boolean): string {
  const fixed = n.toFixed(decimals);
  if (!hasComma) return fixed;
  const [whole, frac] = fixed.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${withCommas}.${frac}` : withCommas;
}

function AnimatedNumber({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const [display, setDisplay] = useState(value);
  const parsed = parseStatValue(value);

  useEffect(() => {
    if (!inView || !parsed) return;
    // OS-level reduced-motion always overrides the count-up, same as the
    // CSS-driven gradient/particle animations elsewhere in this hero — jump
    // straight to the final value instead of running the rAF loop.
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const hasComma = value.includes(",");
    const duration = 1200;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      const current = parsed.digits * eased;
      setDisplay(`${parsed.prefix}${formatCount(current, parsed.decimals, hasComma)}${parsed.suffix}`);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  if (!parsed) return <span ref={ref}>{value}</span>;
  return <span ref={ref}>{display}</span>;
}

export function AnimatedStatRow({ stats }: { stats: StatBadgeData[] }) {
  if (!stats?.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
      {stats.map((s, i) => (
        <div key={i} className="text-center sm:text-left">
          <p
            className="text-2xl sm:text-3xl font-extrabold leading-none font-headline tabular-nums"
            style={{ color: "var(--hero-text)" }}
          >
            <AnimatedNumber value={s.value} />
          </p>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--hero-text-muted)" }}>
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}
