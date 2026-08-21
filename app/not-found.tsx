import Link from 'next/link';
import { headers } from 'next/headers';
import { permanentRedirect } from 'next/navigation';
import { Calendar, Home, Users, ArrowLeft } from 'lucide-react';
import { normalizeOldUrl } from '@/app/lib/domainMigration/parseSitemap';
import { getApprovedRedirect } from '@/app/lib/domainMigration/serveRedirect';

// The actual root cause of a real, live production incident (every
// /[city]/services/[category] page 500ing since Aug 17, confirmed via
// Vercel runtime logs and reproduced locally with `next build && next
// start`): this file's headers() call. ANY page that can call notFound()
// gets this boundary bundled into ITS OWN static-generation attempt (Next
// needs the fallback ready in case notFound() fires) — so headers() here
// was executing during other pages' SSG/ISR render, with no real request
// present, throwing "page changed from static to dynamic at runtime" and
// crashing instead of the intended graceful degradation. force-dynamic
// tells Next this boundary is never attempted statically — it always
// renders fresh per real request instead, which is correct for a 404 page
// anyway (nothing about it benefits from static caching), and stops it
// from poisoning every OTHER page's static generation.
export const dynamic = 'force-dynamic';

export default async function NotFound() {
  // Domain Migration Phase 3 — the only place an approved RedirectMapping
  // actually serves for a real visitor. This lookup only ever runs for a
  // request that would already be a dead-end 404 (x-pathname is set on
  // every public request by middleware.ts); every real, valid page on the
  // site never reaches this file at all, so this can't add latency or risk
  // to normal traffic. On no match, or on any lookup failure, falls straight
  // through to the exact same 404 UI as before — nothing else here changed.
  const pathname = headers().get('x-pathname');
  if (pathname) {
    const newUrl = await getApprovedRedirect(normalizeOldUrl(pathname));
    // permanentRedirect() issues a 308 — the modern, SEO-equivalent
    // successor to a literal 301 (Google treats the two as equivalent
    // permanent-redirect signals); the App Router doesn't expose a way to
    // emit a literal 301 status code directly.
    if (newUrl) permanentRedirect(newUrl);
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0B2560] flex items-center justify-center px-6">
        <div className="text-center max-w-lg w-full">

          {/* Logo text */}
          <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#F5A623] mb-8">
            DR Youth Clinic
          </p>

          {/* 404 */}
          <div className="mb-6">
            <p className="text-[120px] md:text-[160px] font-headline font-black text-white/10 leading-none select-none">
              404
            </p>
            <div className="-mt-8 md:-mt-12">
              <h1 className="text-2xl md:text-3xl font-headline font-extrabold text-white">
                Page Not Found
              </h1>
              <p className="text-white/50 text-sm md:text-base mt-3 leading-relaxed">
                The page you're looking for doesn't exist or may have been moved.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link href="/"
              className="flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-6 py-3 rounded-2xl font-extrabold text-sm hover:-translate-y-0.5 transition shadow-lg shadow-[#F5A623]/20 whitespace-nowrap">
              <Home size={14} /> Back to Home
            </Link>
            <Link href="/book"
              className="flex items-center gap-2 bg-white/10 text-white border border-white/20 px-6 py-3 rounded-2xl font-semibold text-sm hover:bg-white/15 transition whitespace-nowrap">
              <Calendar size={14} /> Book Consultation
            </Link>
          </div>

          {/* Quick links */}
          <div className="flex items-center justify-center gap-6 mt-8 text-xs text-white/40">
            <Link href="/doctors" className="hover:text-white/70 flex items-center gap-1 transition">
              <Users size={11} /> Our Doctors
            </Link>
            <span>·</span>
            <Link href="/blog" className="hover:text-white/70 transition">Blog</Link>
            <span>·</span>
            <Link href="/chennai" className="hover:text-white/70 transition">Locations</Link>
          </div>
        </div>
      </body>
    </html>
  );
}
