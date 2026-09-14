// Extracted out of app/lib/useBranchWhatsApp.ts (a 'use client' file) —
// this one function is pure and has no browser-only API dependency, but
// living inside a 'use client' module meant it couldn't be safely
// imported into a Server Component: Next.js's RSC boundary only creates
// a working client reference for actual React component exports of a
// 'use client' file, not arbitrary named function exports — importing
// this into app/(public)/book/success/page.tsx (a Server Component)
// resolved to a non-function at runtime and crashed
// ("toWaLink is not a function"), confirmed live. Kept here as its own
// tiny, directive-free module so both Server and Client Components can
// use it; useBranchWhatsApp.ts re-exports it unchanged so every existing
// client-side import keeps working exactly as before.
export function toWaLink(value: string): string {
  if (!value) return '';
  if (value.includes('wa.me') || value.includes('whatsapp.com')) return value;
  return `https://wa.me/${value.replace(/\D/g, '')}`;
}
