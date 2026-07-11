import { unstable_cache } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import Booking from '@/app/models/Booking';

/**
 * Shared "today" booking counts — used by both the admin dashboard and the
 * persistent Analytics Strip so their numbers can't drift apart (previously
 * each computed "today" a different way: one used a UTC calendar-date
 * string, the other a server-local midnight Date, which could disagree by
 * several hours depending on deploy timezone).
 *
 * "Today's Completed" is bookings with an appointment `date` of today that
 * are marked completed — not `updatedAt >= today`, which would also match a
 * booking completed days ago and merely edited (e.g. a note fixed) today.
 */
export const getTodayBookingStats = unstable_cache(
  async () => {
    await connectDB();

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);

    const [todayBookings, todayLeads, pendingLeads, todayCompleted] = await Promise.all([
      Booking.countDocuments({ date: todayStr } as any),
      Booking.countDocuments({ createdAt: { $gte: todayStart } } as any),
      Booking.countDocuments({ status: 'new' } as any),
      Booking.countDocuments({ status: 'completed', date: todayStr } as any),
    ]);

    return { todayBookings, todayLeads, pendingLeads, todayCompleted };
  },
  ['today-booking-stats'],
  { revalidate: 60, tags: ['bookings'] }
);
