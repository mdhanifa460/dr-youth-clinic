"use client";

// Only the `whatsapp` variant needs client-side behavior (branch-aware
// number resolution below) — marking the whole file 'use client' is safe
// even though GlassHeroBanner.tsx (the caller) is a server component:
// this file has no Mongoose/server-only imports of its own, so a server
// component rendering it as a child doesn't pull anything unwanted into
// the client bundle, unlike BannerRenderer's own template subtree (see
// BannerCarousel.tsx's comment on why *that* boundary is stricter).
import Link from "next/link";
import { useBranchWhatsApp, toWaLink } from "@/app/lib/useBranchWhatsApp";

// Three-role CTA for the Glass Hero (Book / Assessment / WhatsApp) — a
// distinct visual language from the site's other banners' CTAButton
// (which only has 2 roles), styled via the --hero-accent/--hero-glass-*
// CSS vars a heroTheme sets on the wrapper, so it stays correct across
// every theme without per-variant color literals here.
export default function GlassCTAButton({
  label,
  href,
  variant = "primary",
}: {
  label: string;
  href: string;
  variant?: "primary" | "glass" | "whatsapp";
}) {
  // Called unconditionally, before the early return below, per Rules of
  // Hooks — a falsy href/label still needs this hook to have run so the
  // component's hook order never changes between renders.
  const branchWhatsApp = useBranchWhatsApp(variant === "whatsapp" ? href : "");

  if (!label || !href) return null;

  const base =
    "min-h-12 px-6 sm:px-7 py-3 rounded-2xl font-semibold text-sm sm:text-base transition-all duration-300 flex items-center justify-center gap-2 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

  if (variant === "primary") {
    return (
      <Link
        href={href}
        className={`${base} shadow-[0_10px_30px_-8px_rgba(0,0,0,0.35)] focus-visible:ring-[var(--hero-accent)]`}
        style={{ background: "var(--hero-accent)", color: "var(--hero-accent-text)" }}
      >
        {label}
        <span aria-hidden="true">→</span>
      </Link>
    );
  }

  if (variant === "whatsapp") {
    // Branch-aware — a banner can target several locations at once, so a
    // single static number here would be wrong on at least some of them.
    // `href` (whatever the admin entered) is only the fallback until a
    // branch is detected.
    const waHref = toWaLink(branchWhatsApp) || href;
    return (
      <Link
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} bg-[#25D366]/15 text-[#128C4A] ring-1 ring-[#25D366]/40 hover:bg-[#25D366]/25 focus-visible:ring-[#25D366] backdrop-blur-md`}
      >
        <span aria-hidden="true">💬</span>
        {label}
      </Link>
    );
  }

  // "glass" — the secondary, translucent CTA
  return (
    <Link
      href={href}
      className={`${base} backdrop-blur-md focus-visible:ring-[var(--hero-text)]`}
      style={{
        background: "var(--hero-glass-bg)",
        color: "var(--hero-text)",
        border: "1px solid var(--hero-glass-border)",
      }}
    >
      {label}
    </Link>
  );
}
