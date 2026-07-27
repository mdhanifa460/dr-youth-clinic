"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export interface ServiceChip {
  label: string;
  icon: string;
  href: string;
}

// Floating glass pills — reads its own list from the banner (admin-authored
// label/icon/href), not app/lib/serviceCategories.ts's CATEGORY_MAP, since
// the hero's chips are a curated highlight (e.g. "PRP", "GFC") rather than
// the fixed 4-category taxonomy those listing pages use.
export function ServiceChipRow({ chips }: { chips: ServiceChip[] }) {
  if (!chips?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 sm:gap-2.5" role="list" aria-label="Popular treatments">
      {chips.map((c, i) => (
        <motion.div key={i} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} role="listitem">
          <Link
            href={c.href || "#"}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium backdrop-blur-md transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2"
            style={{
              background: "var(--hero-glass-bg)",
              border: "1px solid var(--hero-glass-border)",
              color: "var(--hero-text)",
            }}
          >
            {c.icon && <span aria-hidden="true">{c.icon}</span>}
            {c.label}
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
