import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { BannerPopupEvent, type BannerPopupEventType } from '@/app/models/BannerPopupEvent';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';

const VALID_TYPES = new Set<BannerPopupEventType>([
  'flash_offer_view',
  'flash_offer_close',
  'flash_offer_cta_click',
]);

// Public, unauthenticated, fire-and-forget from the homepage — same
// "never block the visitor-facing UI on an analytics write" posture as
// booking-success-event's route, which this is a direct structural copy of.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`banner-popup-event:${ip}`, 60, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    const { bannerId, eventType, offerName, page, source } = await req.json();
    if (!bannerId || typeof bannerId !== 'string') {
      return NextResponse.json({ success: false, message: 'bannerId is required' }, { status: 400 });
    }
    if (!VALID_TYPES.has(eventType)) {
      return NextResponse.json({ success: false, message: 'Invalid eventType' }, { status: 400 });
    }

    await connectDB();
    await BannerPopupEvent.create({
      bannerId,
      eventType,
      offerName: typeof offerName === 'string' ? offerName.slice(0, 200) : '',
      page: typeof page === 'string' ? page.slice(0, 60) : '',
      source: typeof source === 'string' ? source.slice(0, 60) : '',
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Failed to log event' }, { status: 500 });
  }
}
