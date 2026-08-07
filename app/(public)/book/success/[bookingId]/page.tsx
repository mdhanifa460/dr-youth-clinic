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
  const branchInfo = locations[branchKey] || null;

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
