import Link from 'next/link';
import { Calendar, Home, Users, ArrowLeft } from 'lucide-react';
import NotFoundRedirectCheck from './not-found-redirect-check';

// This file previously called headers() directly (to read x-pathname and
// look up Domain Migration's approved-redirect mapping — see git history /
// app/api/domain-migration/check-redirect/route.ts for the full writeup).
// That call was ALSO the actual root cause of a real, live production
// incident (every /[city]/services/[category] page 500ing since Aug 17,
// confirmed via Vercel runtime logs and reproduced locally with `next
// build && next start`): ANY page that can call notFound() gets this
// boundary bundled into ITS OWN static-generation attempt (Next needs the
// fallback ready in case notFound() fires), so headers() here ran during
// OTHER pages' SSG/ISR render too. `dynamic = 'force-dynamic'` (previously
// set here) only stopped the crash — confirmed via a `dynamic = 'error'`
// build probe on "/" that this boundary's headers() call was STILL forcing
// every other page on the site (home, /blog, ...) into full per-request
// dynamic rendering, losing ISR/static caching site-wide. The redirect
// lookup itself now happens client-side (NotFoundRedirectCheck, via a tiny
// API route) instead, which can't affect any other page's render at all —
// this file has zero dynamic API calls now and is free to prerender as a
// plain static shell.

export default function NotFound() {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0B2560] flex items-center justify-center px-6">
        <NotFoundRedirectCheck />
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
