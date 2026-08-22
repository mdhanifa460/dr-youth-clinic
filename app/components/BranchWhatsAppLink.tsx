'use client';

// A wa.me link that resolves to the visitor's actual branch's WhatsApp
// number instead of one sitewide number — see useBranchWhatsApp for the
// detection/fetch logic. Falls back to the `fallback` prop (the sitewide
// number) until a branch-specific one is found, or forever if no
// location signal exists at all.
import { useBranchWhatsApp, toWaLink, useAttributedWaText } from '@/app/lib/useBranchWhatsApp';

export default function BranchWhatsAppLink({
  fallback,
  children,
  className,
  style,
  ariaLabel,
  explicitLocation,
  message,
}: {
  fallback: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  // When the caller already knows the visitor's branch more precisely than
  // pathname/cookie inference can (e.g. this specific before/after result
  // belongs to one branch) — see useBranchWhatsApp's own comment.
  explicitLocation?: string;
  // Optional prefilled message — when provided, the visitor's current
  // marketing attribution (UTM/click-ID, via the existing cookies) is
  // appended as a short reference tag so the WhatsApp conversion can later
  // be traced back to its campaign. Omitted entirely (existing behavior,
  // unchanged) when no message is passed.
  message?: string;
}) {
  const number = useBranchWhatsApp(fallback, explicitLocation);
  // Hook called unconditionally (even when `message` is undefined) to
  // satisfy the rules of hooks — useAttributedWaText("") is a harmless
  // no-op call whose result is simply unused in that case.
  const attributedMessage = useAttributedWaText(message || '');
  const base = toWaLink(number);
  if (!base) return null;
  const href = message
    ? `${base}${base.includes('?') ? '&' : '?'}text=${encodeURIComponent(attributedMessage)}`
    : base;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} style={style} aria-label={ariaLabel}>
      {children}
    </a>
  );
}
