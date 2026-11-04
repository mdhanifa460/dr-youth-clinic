'use client';

import { useBranchPhone } from '@/app/lib/useBranchWhatsApp';

// A tel: link showing the visitor's branch number, for server components that
// can't use the hook themselves. Shows `fallback` until a branch is detected.
export default function BranchPhoneLink({
  fallback,
  className,
  children,
}: {
  fallback: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const phone = useBranchPhone(fallback);
  return (
    <a href={`tel:${phone.replace(/\s/g, '')}`} className={className}>
      {children}
      <span>{phone}</span>
    </a>
  );
}
