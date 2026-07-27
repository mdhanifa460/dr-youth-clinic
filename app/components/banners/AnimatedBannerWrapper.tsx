"use client";

import { motion } from "framer-motion";

// Centralizes the "entrance animation" requirement in one place so none of
// the template components need to re-implement fade/slide-up logic
// individually. `skipEntrance` opts out for templates that are themselves
// the LCP element (glass-hero) — an opacity-0 initial state on the largest
// above-the-fold element adds real risk (a slow viewport-observer tick
// delaying paint) for no benefit, since it's never actually below the fold
// on first load.
export default function AnimatedBannerWrapper({
  children,
  skipEntrance = false,
}: {
  children: React.ReactNode;
  skipEntrance?: boolean;
}) {
  if (skipEntrance) return <section>{children}</section>;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
}
