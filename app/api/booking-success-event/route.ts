import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { BookingSuccessEvent, type BookingSuccessEventType } from '@/app/models/BookingSuccessEvent';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';

const VALID_TYPES = new Set<BookingSuccessEventType>([
  'page_view',
  'cta_click_calendar',
  'cta_click_directions',
  'cta_click_whatsapp',
  'cta_click_call',
  'cta_click_portal',
  'cta_click_bookAnother',
  'checklist_ai_assessment_click',
  'checklist_upload_reports_click',
]);

// Public, unauthenticated, fire-and-forget from the Booking Success page —
// same "never block the patient-facing UI on an analytics write" posture
// as the rest of this codebase's tracking calls.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`booking-success-event:${ip}`, 60, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    const { bookingId, eventType, location } = await req.json();
    if (!bookingId || typeof bookingId !== 'string') {
      return NextResponse.json({ success: false, message: 'bookingId is required' }, { status: 400 });
    }
    if (!VALID_TYPES.has(eventType)) {
      return NextResponse.json({ success: false, message: 'Invalid eventType' }, { status: 400 });
    }

    await connectDB();
    await BookingSuccessEvent.create({
      bookingId,
      eventType,
      location: typeof location === 'string' ? location.slice(0, 60) : '',
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Failed to log event' }, { status: 500 });
  }
}
