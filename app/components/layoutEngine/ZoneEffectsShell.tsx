'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const ANIMATION_VARIANTS: Record<string, { initial: any; whileInView: any }> = {
  'fade-up': { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 } },
  'fade-in': { initial: { opacity: 0 }, whileInView: { opacity: 1 } },
};

// The one client boundary the Layout Engine needs for animation/collapsible.
// It receives the already server-rendered section as `children` — a Server
// Component's output stays server-rendered even when passed as children into
// a Client Component, so this shell doesn't force hydration of the leaf.
export default function ZoneEffectsShell({
  animationPreset,
  skipAnimation,
  collapsible,
  label,
  children,
}: {
  animationPreset?: string;
  skipAnimation?: boolean;
  collapsible?: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const variant = !skipAnimation && animationPreset && animationPreset !== 'none'
    ? ANIMATION_VARIANTS[animationPreset]
    : undefined;

  const body = collapsible ? (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-sm font-bold text-[#0B2560]"
      >
        {label ?? 'Show section'}
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && children}
    </div>
  ) : children;

  if (!variant) return <>{body}</>;

  return (
    <motion.div
      initial={variant.initial}
      whileInView={variant.whileInView}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {body}
    </motion.div>
  );
}
