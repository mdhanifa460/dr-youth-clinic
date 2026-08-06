'use client';

// A wa.me link that resolves to the visitor's actual branch's WhatsApp
// number instead of one sitewide number — see useBranchWhatsApp for the
// detection/fetch logic. Falls back to the `fallback` prop (the sitewide
// number) until a branch-specific one is found, or forever if no
// location signal exists at all.
import { useBranchWhatsApp, toWaLink } from '@/app/lib/useBranchWhatsApp';

export default function BranchWhatsAppLink({
  fallback,
  children,
  className,
  style,
  ariaLabel,
  explicitLocation,
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
}) {
  const number = useBranchWhatsApp(fallback, explicitLocation);
  const href = toWaLink(number);
  if (!href) return null;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} style={style} aria-label={ariaLabel}>
      {children}
    </a>
  );
}
