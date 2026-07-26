import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import Booking from '@/app/models/Booking';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';
import { normalizePhone } from '@/app/lib/phone';

// Public, unauthenticated by design — no separate patient login system.
// The booking ID (shown once, on the confirmation screen right after
// booking, and in the WhatsApp confirmation message) acts as the shared
// secret; phone + bookingId together is the credential. Rate-limited
// per IP since this is the one place a booking ID could be brute-forced
// against a known phone number.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`my-appointments-lookup:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    const { phone, bookingId } = await req.json();
    if (!phone || !bookingId || typeof phone !== 'string' || typeof bookingId !== 'string') {
      return NextResponse.json({ success: false, message: 'Phone number and booking ID are required' }, { status: 400 });
    }

    const formattedPhone = normalizePhone(phone);
    if (!formattedPhone) {
      return NextResponse.json({ success: false, message: 'Invalid phone number' }, { status: 400 });
    }

    await connectDB();

    const current = await (Booking as any).findOne({
      formattedPhone,
      bookingId: bookingId.trim().toUpperCase(),
    }).lean();

    if (!current) {
      return NextResponse.json({ success: false, message: 'No booking found with that phone number and booking ID' }, { status: 404 });
    }

    const history = await (Booking as any)
      .find({ formattedPhone, _id: { $ne: current._id } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('bookingId service location date time status createdAt')
      .lean();

    return NextResponse.json({ success: true, data: { current, history } });
  } catch {
    return NextResponse.json({ success: false, message: 'Something went wrong — please try again' }, { status: 500 });
  }
}
