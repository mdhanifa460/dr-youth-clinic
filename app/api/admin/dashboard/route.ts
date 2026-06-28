import { NextResponse } from 'next/server';
import { requireAdminSession, unauthorized } from '@/app/lib/adminAuth';
import { connectDB } from '@/app/lib/mongodb';
import Booking from '@/app/models/Booking';
import { Review } from '@/app/models/Review';
import { Service } from '@/app/models/Service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return unauthorized();

  await connectDB();

  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    todayBookings,
    pendingLeads,
    totalBookings,
    newReviews,
    totalServices,
    recentBookings,
    recentReviews,
  ] = await Promise.all([
    Booking.countDocuments({ date: today }),
    Booking.countDocuments({ status: 'new' }),
    Booking.countDocuments({}),
    Review.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    Service.countDocuments({ status: 'active' }),
    Booking.find().sort({ createdAt: -1 }).limit(5)
      .select('name phone service location date status createdAt').lean(),
    Review.find().sort({ createdAt: -1 }).limit(4)
      .select('authorName rating reviewText source isVisible createdAt').lean(),
  ]);

  return NextResponse.json({
    stats: { todayBookings, pendingLeads, totalBookings, newReviews, services: totalServices, locations: 4 },
    recentBookings: JSON.parse(JSON.stringify(recentBookings)),
    recentReviews: JSON.parse(JSON.stringify(recentReviews)),
  });
}
