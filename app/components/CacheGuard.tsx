"use client";

import { useEffect } from "react";

// Placed in root layout so it covers every public page.
//
// Handles two browser cache failure modes that cause chunk-load errors:
//
// 1. bfcache (back-forward cache): browsers snapshot full page state in memory
//    and restore it instantly on back/forward — bypassing all Cache-Control headers.
//    If the app rebuilt since that snapshot, old JS chunk references 404.
//    Fix: detect `event.persisted` on `pageshow` and reload.
//
// 2. Stale HTML in disk/CDN cache: old HTML references chunk hashes that no
//    longer exist after a new deployment. Max-age=0 + ETag validation in
//    next.config.js prevents this in normal navigation, but CacheGuard catches
//    any that slip through and auto-recovers once per session.
export default function CacheGuard() {
  useEffect(() => {
    const RELOAD_KEY = "_cg_r";

    // Clear reload flag on successful page mount — chunks loaded fine.
    sessionStorage.removeItem(RELOAD_KEY);

    // bfcache restore: persisted = page came from memory snapshot, not server.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);

    // Chunk load error: stale HTML referencing outdated JS chunk hash.
    // Reload once; if it fails again, stop (prevents infinite reload loop).
    const onError = (e: ErrorEvent) => {
      const msg = e.message ?? "";
      const isChunk =
        msg.includes("Loading chunk") ||
        msg.includes("Failed to fetch dynamically imported module") ||
        e.error?.name === "ChunkLoadError";
      if (!isChunk) return;

      if (!sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
      } else {
        sessionStorage.removeItem(RELOAD_KEY);
      }
    };
    window.addEventListener("error", onError);

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}
