// Fetches the "related signals" computeQualification() needs, from the
// actual records that exist today. Lead and Booking are only phone-linked
// (no shared ObjectId), so the match goes through normalizePhone — the same
// canonical normalization already used everywhere else phone numbers are
// compared (app/lib/phone.ts).
import { Lead } from '@/app/models/Lead';
import { BookingSuccessEvent } from '@/app/models/BookingSuccessEvent';
import { normalizePhone } from '@/app/lib/phone';
import type { RelatedSignals } from './computeQualification';

export async function getRelatedSignals(booking: { phone?: string; bookingId?: string }): Promise<RelatedSignals> {
  const signals: RelatedSignals = {};

  try {
    if (booking.phone) {
      const normalized = normalizePhone(booking.phone);
      const last10 = normalized.slice(-10);
      // Lead.phone is stored as whatever the skin-quiz form submitted, not
      // pre-normalized — a last-10-digits regex match (then a full
      // normalizePhone() confirm) finds the same lead regardless of
      // leading-0 / +91 / 91 formatting differences, without scanning the
      // whole Lead collection.
      const candidates = last10.length === 10
        ? await (Lead as any).find({ phone: new RegExp(last10 + '$') }).select('phone assessmentResult').lean()
        : [];
      const matched = (candidates as any[]).find((l) => l.phone && normalizePhone(l.phone) === normalized);
      if (matched) {
        signals.assessmentCompleted = !!(matched.assessmentResult?.riskScore != null || matched.assessmentResult?.severity);
        signals.assessmentRiskLevel = matched.assessmentResult?.riskLevel || matched.assessmentResult?.severity || '';
      }
    }
  } catch {
    // Never let a signal lookup failure block scoring — missing signals
    // just mean those rules won't match, same as "unclassified" being an
    // honest default rather than a guess.
  }

  try {
    if (booking.bookingId) {
      const count = await BookingSuccessEvent.countDocuments({ bookingId: booking.bookingId });
      signals.hasBookingSuccessEvent = count > 0;
    }
  } catch {
    // same — non-fatal
  }

  return signals;
}
