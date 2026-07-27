import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Hero-local teaser card, deliberately NOT a second floating widget — the
// site already has one persistent floating assistant (AiChatWidget, mounted
// globally in app/(public)/layout.tsx). This is just an inline glass card
// that deep-links into the same assessment flow other CTAs already point
// to (see the "glass-hero" BANNER_TEMPLATES default, /skin-quiz).
export function FloatingAssistantTeaser({
  teaser,
}: {
  teaser: { enabled: boolean; text: string; ctaLabel: string; href: string } | undefined;
}) {
  if (!teaser?.enabled || !teaser.text) return null;

  return (
    <Link
      href={teaser.href || "/skin-quiz"}
      className="group inline-flex items-center gap-3 rounded-2xl px-4 py-3 backdrop-blur-md transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2"
      style={{
        background: "var(--hero-glass-bg)",
        border: "1px solid var(--hero-glass-border)",
        color: "var(--hero-text)",
      }}
    >
      <span className="text-xl" aria-hidden="true">👋</span>
      <span className="text-sm font-medium">{teaser.text}</span>
      {teaser.ctaLabel && (
        <span className="inline-flex items-center gap-1 text-sm font-semibold shrink-0" style={{ color: "var(--hero-accent)" }}>
          {teaser.ctaLabel}
          <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      )}
    </Link>
  );
}
