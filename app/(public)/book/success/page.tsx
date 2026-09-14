import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { Calendar, CheckCircle, MapPin, Phone } from 'lucide-react';
import { BOOKING_SUCCESS_ID_COOKIE } from '@/app/lib/bookingSuccessRedirect';
import { connectDB } from '@/app/lib/mongodb';
import Booking from '@/app/models/Booking';
import '@/app/models/Doctor';
import { Result } from '@/app/models/Result';
import { Review } from '@/app/models/Review';
import { Faq } from '@/app/models/Faq';
import { Offer } from '@/app/models/Offer';
import { getBookingSuccessConfig } from '@/app/models/BookingSuccessConfig';
import { getSiteConfig } from '@/app/lib/siteConfig';
import { locations } from '@/app/data/locations';
import { LocationContent } from '@/app/models/LocationContent';
import BookingSuccessClient from '@/app/components/booking/BookingSuccessClient';
import { toWaLink } from '@/app/lib/waLink';

export const metadata: Metadata = {
  title: 'Booking Confirmed | DR Youth Clinic',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

async function getBookingData(bookingId: string) {
  await connectDB();
  const booking = await (Booking as any).findOne({ bookingId }).populate('doctorId').lean();
  return booking ? JSON.parse(JSON.stringify(booking)) : null;
}

// Deliberately NOT notFound() — confirmed live against a real production
// build that this exact route silently returns 200 with no real 404
// status when notFound() is called (a confirmed Next.js 14.2.35 bug,
// same one middleware.ts's Domain Migration check already works around
// for a different route). middleware.ts now catches the "no bookingId at
// all" case before it ever reaches here (redirects to /book), but it has
// no way to check whether a *present* bookingId actually matches a real
// Booking — that check can only happen here, after the DB lookup. This
// page is already robots:{index:false}, so there's no SEO cost to a 200
// here; a plain, friendly message is more useful to a real visitor than
// a bare 404 either way.
function BookingNotFoundFallback() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-6 py-20">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-headline font-extrabold text-[#0B2560] mb-2">
          We couldn&apos;t find that booking
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          This confirmation link may be incomplete or the booking may no longer exist.
          You can book a new consultation below, or call us directly.
        </p>
        <Link
          href="/book"
          className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-6 py-3 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition shadow-md"
        >
          <Calendar size={13} /> Book a Consultation
        </Link>
      </div>
    </main>
  );
}

// Shared by both the real-booking path and the generic no-bookingId path
// below — resolves a branch key to its display info exactly once, same
// DB-over-static-fallback precedence either way.
async function resolveBranchInfo(branchKey: string) {
  const staticBranchInfo = locations[branchKey] || null;
  if (!staticBranchInfo) return null;
  const locationContent = await (LocationContent as any)
    .findOne({ location: branchKey })
    .select('clinicInfo.address clinicInfo.phone')
    .lean()
    .catch(() => null);
  return {
    ...staticBranchInfo,
    address: locationContent?.clinicInfo?.address || staticBranchInfo.address,
    phone: locationContent?.clinicInfo?.phone || staticBranchInfo.phone,
  };
}

// A visitor who lands here with a real, valid `location` but no
// identifiable booking at all — no cookie (expired, cleared, or never
// set), no legacy bookingId query param. This is exactly the shape an ad
// platform's own Thank-You-Page trigger uses going forward (see
// app/lib/bookingSuccessRedirect.ts: bookingId deliberately never
// appears in the URL anymore), and at least one platform's own setup
// flow actually FETCHES the configured URL itself to confirm it resolves
// before saving the conversion action — bouncing this to /book (this
// page's older behavior) would fail that check every time, even though
// every real conversion already carries the cookie and would never hit
// this branch in practice. Never fabricates a booking ID, date, or name —
// only ever shows real, branch-level information that's true regardless
// of which specific visitor is looking at it.
function GenericBranchThankYou({
  branchInfo,
  siteConfig,
}: {
  branchInfo: Awaited<ReturnType<typeof resolveBranchInfo>>;
  siteConfig: { publicWhatsApp?: string; publicPhone?: string };
}) {
  const waHref = toWaLink(branchInfo?.phone || siteConfig.publicWhatsApp || '');
  const phone = branchInfo?.phone || siteConfig.publicPhone || '';
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-6 py-20">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={32} className="text-emerald-500" />
        </div>
        <h1 className="text-2xl font-headline font-extrabold text-[#0B2560] mb-2">
          Thank You!
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          {branchInfo
            ? `We've received your enquiry for our ${branchInfo.name} branch. Our team will reach out shortly to confirm your appointment.`
            : "We've received your enquiry. Our team will reach out shortly to confirm your appointment."}
        </p>

        {branchInfo && (
          <div className="bg-[#f6faff] border border-blue-50 rounded-2xl p-5 text-left mb-8 space-y-3">
            <div className="flex items-start gap-2.5 text-sm text-gray-700">
              <MapPin size={16} className="text-[#0B2560] shrink-0 mt-0.5" />
              <span>{branchInfo.address}</span>
            </div>
            {phone && (
              <div className="flex items-center gap-2.5 text-sm text-gray-700">
                <Phone size={16} className="text-[#0B2560] shrink-0" />
                <span>{phone}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {phone && (
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              className="inline-flex items-center justify-center gap-2 bg-[#0B2560] text-white px-6 py-3 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition shadow-md"
            >
              <Phone size={15} /> Call Clinic
            </a>
          )}
          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#128C4A] border border-[#25D366]/30 px-6 py-3 rounded-2xl font-bold text-sm hover:bg-[#25D366]/20 transition"
            >
              WhatsApp Clinic
            </a>
          )}
          <Link
            href="/book"
            className="inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-600 px-6 py-3 rounded-2xl font-semibold text-sm hover:bg-gray-50 transition"
          >
            <Calendar size={13} /> Book a Consultation
          </Link>
        </div>
      </div>
    </main>
  );
}

// A fixed path (/book/success) — not a dynamic [bookingId] path segment,
// and (as of the cookie-based lookup below) not even a bookingId query
// param on the happy path either — every real booking used to get its
// own unique URL, which made it impossible for an external ad tool
// (Google Ads/Meta "Thank You Page" URL matching) to configure conversion
// tracking against a single stable page. Query-param bookingId turned out
// to still be one bookingId too many for at least one ad platform: its
// thank-you-page trigger requires an EXACT URL match, not "contains", and
// an exact match against a value that's different on every single
// booking can only ever fire once (whatever sample URL it was configured
// with). See app/lib/bookingSuccessRedirect.ts's own comment for the full
// story — bookingId now travels in a short-lived cookie instead, so the
// real, live URL an ad platform's trigger sees is always the exact same
// literal string, every time. bookingId is still required — this page
// still looks up the exact Booking record by it, server-side, with full
// certainty; only where it lives changed. The query param is kept as a
// fallback (not the primary path) for the legacy dynamic route/any
// already-shared link (see app/(public)/book/success/[bookingId]/page.tsx).
export default async function BookingSuccessPage({ searchParams }: { searchParams: { bookingId?: string; location?: string } }) {
  const bookingId = cookies().get(BOOKING_SUCCESS_ID_COOKIE)?.value || searchParams.bookingId;

  // No identifiable booking at all — the cookie expired/was cleared, or
  // (as of the URL now permanently carrying `location` for ad-platform
  // matching — see app/lib/bookingSuccessRedirect.ts) this is a direct
  // hit with only `location` and no bookingId anywhere. See
  // GenericBranchThankYou's own comment for why that's an expected,
  // legitimate case to handle well, not just a defensive fallback.
  if (!bookingId) {
    const genericBranchKey = String(searchParams.location || '').toLowerCase();
    if (locations[genericBranchKey]) {
      await connectDB();
      const [branchInfo, genericSiteConfig] = await Promise.all([
        resolveBranchInfo(genericBranchKey),
        getSiteConfig(),
      ]);
      return (
        <GenericBranchThankYou
          branchInfo={branchInfo}
          siteConfig={{ publicWhatsApp: genericSiteConfig.publicWhatsApp, publicPhone: genericSiteConfig.publicPhone }}
        />
      );
    }
    // Normally unreachable otherwise — middleware.ts redirects a request
    // with neither the cookie, the legacy bookingId param, nor a
    // recognized location to /book before it gets here. Kept as a
    // defensive fallback only (see BookingNotFoundFallback's own comment
    // for why this isn't notFound()).
    return <BookingNotFoundFallback />;
  }

  const booking = await getBookingData(bookingId);
  if (!booking) return <BookingNotFoundFallback />;

  const [config, siteConfig] = await Promise.all([getBookingSuccessConfig(), getSiteConfig()]);
  const branchKey = String(booking.location || '').toLowerCase();

  // This page always knows the REAL branch with certainty (it's the
  // booking's own `location` field, not guessed from a cookie/pathname
  // the way Footer.tsx has to) — so, unlike Footer, there's no reason to
  // resolve this client-side at all. See resolveBranchInfo's own comment
  // for the DB-over-static-fallback precedence (also shared with the
  // generic no-bookingId path above).
  await connectDB();
  const branchInfo = await resolveBranchInfo(branchKey);

  const enabledSections = new Set(
    (config.relatedSections || []).filter((s: any) => s.enabled).map((s: any) => s.key)
  );

  await connectDB();
  const [beforeAfter, successStories, faqs, offers] = await Promise.all([
    enabledSections.has('beforeAfter')
      ? (Result as any)
          .find({ active: true, ...(branchKey ? { branch: { $in: [branchKey, 'all'] } } : {}) })
          .sort({ order: 1, createdAt: -1 })
          .limit(4)
          .lean()
          .catch(() => [])
      : Promise.resolve([]),
    enabledSections.has('successStories')
      ? (Review as any)
          .find({ isVisible: true, showOnHomepage: true, ...(branchKey ? { location: branchKey } : {}) })
          .sort({ isFeatured: -1, displayOrder: 1 })
          .limit(3)
          .lean()
          .catch(() => [])
      : Promise.resolve([]),
    enabledSections.has('faqs')
      ? (Faq as any).find({ active: true }).sort({ featured: -1, order: 1 }).limit(5).select('question answer').lean().catch(() => [])
      : Promise.resolve([]),
    enabledSections.has('offers')
      ? (Offer as any).find({ active: true }).sort({ order: 1, createdAt: -1 }).limit(3).lean().catch(() => [])
      : Promise.resolve([]),
  ]);

  // Before & After needs branch-specific results first, but a brand-new or
  // low-volume branch may not have any yet — widen to sitewide results
  // rather than showing an empty section a patient would read as "this
  // clinic doesn't have real results," which isn't true.
  let resolvedBeforeAfter = beforeAfter;
  if (enabledSections.has('beforeAfter') && resolvedBeforeAfter.length === 0) {
    resolvedBeforeAfter = await (Result as any).find({ active: true }).sort({ order: 1, createdAt: -1 }).limit(4).lean().catch(() => []);
  }
  let resolvedStories = successStories;
  if (enabledSections.has('successStories') && resolvedStories.length === 0) {
    resolvedStories = await (Review as any)
      .find({ isVisible: true, showOnHomepage: true })
      .sort({ isFeatured: -1, displayOrder: 1 })
      .limit(3)
      .lean()
      .catch(() => []);
  }

  return (
    <BookingSuccessClient
      booking={booking}
      config={JSON.parse(JSON.stringify(config))}
      branchInfo={branchInfo}
      siteConfig={{ publicWhatsApp: siteConfig.publicWhatsApp, publicPhone: siteConfig.publicPhone }}
      related={{
        beforeAfter: JSON.parse(JSON.stringify(resolvedBeforeAfter)),
        successStories: JSON.parse(JSON.stringify(resolvedStories)),
        faqs: JSON.parse(JSON.stringify(faqs)),
        offers: JSON.parse(JSON.stringify(offers)),
      }}
    />
  );
}
