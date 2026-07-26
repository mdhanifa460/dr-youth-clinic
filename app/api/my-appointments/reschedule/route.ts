import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import Booking from '@/app/models/Booking';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';
import { normalizePhone } from '@/app/lib/phone';

// Re-verifies phone + bookingId on every call rather than trusting that the
// client already passed the lookup screen — a stale/replayed request with
// no valid credentials must never be able to touch someone else's booking.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`my-appointments-reschedule:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    const { phone, bookingId, requestedDate, requestedTime, note } = await req.json();
    if (!phone || !bookingId || !requestedDate || !requestedTime) {
      return NextResponse.json({ success: false, message: 'Phone, booking ID, and a preferred date and time are required' }, { status: 400 });
    }

    const formattedPhone = normalizePhone(phone);
    if (!formattedPhone) {
      return NextResponse.json({ success: false, message: 'Invalid phone number' }, { status: 400 });
    }

    await connectDB();

    const booking = await (Booking as any).findOne({
      formattedPhone,
      bookingId: String(bookingId).trim().toUpperCase(),
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: 'No booking found with that phone number and booking ID' }, { status: 404 });
    }

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return NextResponse.json({ success: false, message: `This booking is already ${booking.status} and can't be rescheduled` }, { status: 400 });
    }

    booking.rescheduleRequest = {
      requestedDate: String(requestedDate).trim().slice(0, 40),
      requestedTime: String(requestedTime).trim().slice(0, 40),
      note: typeof note === 'string' ? note.trim().slice(0, 300) : '',
      requestedAt: new Date(),
    };
    await booking.save();

    return NextResponse.json({ success: true, message: "Reschedule request sent — our team will confirm your new slot shortly." });
  } catch {
    return NextResponse.json({ success: false, message: 'Something went wrong — please try again' }, { status: 500 });
  }
}
