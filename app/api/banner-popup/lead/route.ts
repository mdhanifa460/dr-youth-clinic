import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Banner } from '@/app/models/Banner';
import Booking from '@/app/models/Booking';
import { BannerPopupEvent } from '@/app/models/BannerPopupEvent';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';
import { normalizePhone, isValidIndianMobile, INVALID_MOBILE_MESSAGE } from '@/app/lib/phone';
import { getClinicNotifyNumber } from '@/app/lib/clinicNotify';
import { sendWhatsAppText } from '@/app/lib/whatsapp';
import { pushBookingToCrm } from '@/app/lib/crm/pushBooking';
import { buildAttributionFields } from '@/app/lib/utmAttribution';
import { qualifyAndPersist } from '@/app/lib/leadQualification/persist';
import { checkIpRisk } from '@/app/lib/ipIntelligence';
import { normalizeIdempotencyKey, extractIdentity, identitiesMatch, createBookingIdempotent } from '@/app/lib/bookingIdempotency';

// Inline Lead Form submit handler for the Flash Offer Popup
// (HomepageOfferSplash.tsx) — the one place a visitor can become a real
// Booking without ever navigating off the page they were browsing. Same
// idempotency/attribution/qualification/CRM-push/WhatsApp-alert mechanics
// as every other real lead-creation route (closest structural sibling:
// app/api/lp/[slug]/lead/route.ts), just keyed by bannerId instead of an
// LP slug, and reporting into BannerPopupEvent (flash_offer_lead_submitted)
// instead of a LandingPage analytics counter.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`banner-popup-lead:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    await connectDB();

    const body = await req.json();
    // Public, unauthenticated input — coerce to bounded strings up front so
    // nothing user-supplied (page/name/email) can be an object (Mongo
    // operator injection) or arbitrarily large (stored in notes/analytics).
    const bannerId = typeof body.bannerId === 'string' ? body.bannerId : '';
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
    const phone = typeof body.phone === 'string' ? body.phone : '';
    const email = typeof body.email === 'string' ? body.email.trim().slice(0, 200) : '';
    const page = typeof body.page === 'string' ? body.page.slice(0, 40) : '';

    // An invalid ObjectId string would otherwise throw a Mongoose CastError
    // below and surface as a generic 500 instead of a clean 400.
    if (!/^[a-f0-9]{24}$/i.test(bannerId)) {
      return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
    }
    if (!name || !phone) {
      return NextResponse.json({ success: false, message: 'Name and phone are required' }, { status: 400 });
    }
    if (!isValidIndianMobile(phone)) {
      return NextResponse.json({ success: false, message: INVALID_MOBILE_MESSAGE }, { status: 400 });
    }
    const formattedPhone = normalizePhone(phone);

    const banner = await (Banner as any).findOne({ _id: bannerId, status: 'active', formEnabled: true }).lean() as any;
    if (!banner) {
      return NextResponse.json({ success: false, message: 'This offer is no longer available' }, { status: 404 });
    }

    const service = banner.headline || banner.title || 'Popup Offer Enquiry';
    const notes = `Submitted via "${banner.title}" popup${page ? ` on ${page}` : ''}`;

    const idempotencyKey = normalizeIdempotencyKey(req.headers.get('idempotency-key'));
    if (idempotencyKey) {
      const preExisting = await (Booking as any).findOne({ idempotencyKey }).lean();
      if (preExisting) {
        const incomingIdentity = extractIdentity({ name, phone: formattedPhone, service, location: '', date: '', time: '' });
        if (!identitiesMatch(extractIdentity(preExisting), incomingIdentity)) {
          return NextResponse.json(
            { success: false, code: 'IDEMPOTENCY_CONFLICT', message: 'This request has already been processed.' },
            { status: 409 }
          );
        }
        return NextResponse.json({
          success: true,
          message: banner.formSuccessMessage || "Thank you! We'll call you within 2 hours.",
          bookingId: preExisting.bookingId,
          alreadyProcessed: true,
          source: preExisting.source || undefined,
          medium: preExisting.utmMedium || undefined,
          campaign: preExisting.utmCampaign || undefined,
        });
      }
    }

    const attribution = buildAttributionFields((n) => req.cookies.get(n)?.value);
    // 'banner-popup' stays the fallback specifically (not 'direct') — same
    // reasoning as the LP route's own 'landing-page' fallback: this is
    // itself a real, already-displayed SOURCE_META-adjacent value (shown
    // capitalized via getSourceMeta's fallback even before any admin adds
    // it explicitly), and a popup submission is itself the intended
    // conversion moment even on a visit with no UTM signal at all.
    const resolvedSource = attribution.utmSource || 'banner-popup';

    const fieldsToSet = {
      bookingId: 'DR-' + Date.now(),
      name,
      phone: formattedPhone,
      formattedPhone,
      email: email || '',
      service,
      location: '',
      source: resolvedSource,
      conversionChannel: 'website',
      attributionId: req.cookies.get('visitor_id')?.value || '',
      notes,
      ...attribution,
    };

    const result = await createBookingIdempotent(Booking, idempotencyKey, fieldsToSet);
    if (result.status === 'conflict') {
      return NextResponse.json(
        { success: false, code: 'IDEMPOTENCY_CONFLICT', message: 'This request has already been processed.' },
        { status: 409 }
      );
    }
    const booking = result.booking;

    if (result.status === 'created') {
      pushBookingToCrm(booking).catch(() => {});
      qualifyAndPersist(booking, { reason: 'auto:initial' }).catch(() => {});
      checkIpRisk(ip).then((r) => {
        if (r.checked) (Booking as any).updateOne({ _id: booking._id }, { $set: { ipRiskFlagged: r.isVpnOrProxy } }).catch(() => {});
      }).catch(() => {});

      // Fire-and-forget, mirrors postBannerPopupEvent's own
      // fetch(...).catch(()=>{}) shape but written server-side directly
      // (this route already has the real Booking id to attach) rather than
      // a second round-trip from the client.
      (BannerPopupEvent as any).create({
        bannerId,
        eventType: 'flash_offer_lead_submitted',
        offerName: banner.headline || banner.title || '',
        page: page || 'unknown',
        source: 'popup-form',
      }).catch(() => {});

      getClinicNotifyNumber('').then((to) => {
        if (!to) return;
        sendWhatsAppText(
          to,
          `🆕 New Popup Offer Lead\n\nOffer: ${banner.title}\nName: ${name}\nPhone: ${formattedPhone}${email ? `\nEmail: ${email}` : ''}`
        ).catch(() => {});
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: banner.formSuccessMessage || "Thank you! We'll call you within 2 hours.",
      bookingId: booking.bookingId,
      alreadyProcessed: result.status !== 'created',
      source: booking.source || undefined,
      medium: booking.utmMedium || undefined,
      campaign: booking.utmCampaign || undefined,
    });
  } catch (error) {
    console.error('Banner popup lead submission error:', error);
    return NextResponse.json({ success: false, message: 'Failed to submit — please try again' }, { status: 500 });
  }
}
