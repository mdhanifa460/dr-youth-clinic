"use client";

import { motion } from "framer-motion";

// Centralizes the "entrance animation" requirement in one place so none of
// the 6 template components need to re-implement fade/slide-up logic
// individually.
export default function AnimatedBannerWrapper({ children }: { children: React.ReactNode }) {
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
