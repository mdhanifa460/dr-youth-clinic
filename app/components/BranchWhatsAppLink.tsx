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
}: {
  fallback: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}) {
  const number = useBranchWhatsApp(fallback);
  const href = toWaLink(number);
  if (!href) return null;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} style={style} aria-label={ariaLabel}>
      {children}
    </a>
  );
}
