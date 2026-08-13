import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';
import { canonicalizeLocation } from '@/app/lib/locationNormalize';
import { getDoctorAvailability } from '@/app/lib/doctorAvailability';

export const dynamic = 'force-dynamic';

// Public, unauthenticated — the AI chat widget's doctor-availability check
// and booking-panel doctor picker both need real data without an admin
// session. Read-only. Deliberately no PII in the response — doctor
// name/title/available only, nothing about which patient holds a
// conflicting slot (that reason text is admin-only, see the
// /api/admin/appointments/check-availability sibling route).
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`doctor-availability:${ip}`, 40, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  const { searchParams } = req.nextUrl;
  const location = canonicalizeLocation(searchParams.get('location') || '');
  const date = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';
  const durationMinutes = searchParams.get('durationMinutes') ? Number(searchParams.get('durationMinutes')) : undefined;

  if (!location) {
    return NextResponse.json({ success: false, message: 'A valid clinic location is required.' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ success: false, message: 'date must be YYYY-MM-DD.' }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ success: false, message: 'time must be 24-hour HH:MM.' }, { status: 400 });
  }

  try {
    const result = await getDoctorAvailability(location, date, time, durationMinutes);
    return NextResponse.json({ success: true, location, date, time, ...result });
  } catch (err) {
    console.error('[doctors/availability]', err);
    return NextResponse.json({ success: false, message: 'Could not check availability right now.' }, { status: 500 });
  }
}
