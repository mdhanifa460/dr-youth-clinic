import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'onDark' | 'onDarkOutline';

const BASE =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'border border-line-strong bg-white text-primary hover:border-primary',
  onDark: 'bg-champagne text-primary hover:bg-champagne-hover',
  onDarkOutline: 'border border-white/40 text-white hover:border-white hover:bg-white/10',
};

export function buttonClass(variant: Variant = 'primary', className = '') {
  return `${BASE} ${VARIANTS[variant]} ${className}`.trim();
}

// Internal paths go through next/link; tel:, mailto: and external URLs stay plain anchors.
export function ButtonLink({ href, variant = 'primary', className = '', children, ...rest }: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<'a'>, 'href' | 'className' | 'children'>) {
  const cls = buttonClass(variant, className);
  if (/^(?:https?:|tel:|mailto:)/.test(href)) {
    return <a href={href} className={cls} {...rest}>{children}</a>;
  }
  return <Link href={href} className={cls} {...rest}>{children}</Link>;
}
