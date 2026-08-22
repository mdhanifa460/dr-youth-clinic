import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
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

export default async function BookingSuccessPage({ params }: { params: { bookingId: string } }) {
  const booking = await getBookingData(params.bookingId);
  if (!booking) notFound();

  const [config, siteConfig] = await Promise.all([getBookingSuccessConfig(), getSiteConfig()]);
  const branchKey = String(booking.location || '').toLowerCase();
  const staticBranchInfo = locations[branchKey] || null;

  // This page always knows the REAL branch with certainty (it's the
  // booking's own `location` field, not guessed from a cookie/pathname
  // the way Footer.tsx has to) — so, unlike Footer, there's no reason to
  // resolve this client-side at all. `app/data/locations.ts` is a static,
  // hardcoded fallback file, and its `phone` field is the exact same
  // placeholder number ("+919876543210") for all four branches — a real
  // bug: the "Call Clinic" button here was never showing a branch's
  // actual number, only that one shared placeholder. LocationContent
  // (the DB model admins actually edit at Admin → Locations) is the real
  // source of truth for both fields; the static file's own address values
  // ARE genuinely distinct per branch already, kept only as the fallback
  // for a branch with nothing set in the DB yet.
  const locationContent = branchKey
    ? await (LocationContent as any).findOne({ location: branchKey }).select('clinicInfo.address clinicInfo.phone').lean().catch(() => null)
    : null;
  const branchInfo = staticBranchInfo
    ? {
        ...staticBranchInfo,
        address: locationContent?.clinicInfo?.address || staticBranchInfo.address,
        phone: locationContent?.clinicInfo?.phone || staticBranchInfo.phone,
      }
    : null;

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
