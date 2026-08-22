import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { LandingPage } from '@/app/models/LandingPage';
import Booking from '@/app/models/Booking';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';
import { normalizePhone, isValidIndianMobile, INVALID_MOBILE_MESSAGE } from '@/app/lib/phone';
import { getClinicNotifyNumber } from '@/app/lib/clinicNotify';
import { sendWhatsAppText } from '@/app/lib/whatsapp';
import { pushBookingToCrm } from '@/app/lib/crm/pushBooking';
import { buildAttributionFields } from '@/app/lib/utmAttribution';
import { qualifyAndPersist } from '@/app/lib/leadQualification/persist';
import { checkIpRisk } from '@/app/lib/ipIntelligence';
import { normalizeIdempotencyKey, extractIdentity, identitiesMatch, createBookingIdempotent } from '@/app/lib/bookingIdempotency';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  // Same 5/hour/IP limit as the equivalent app/api/leads/route.ts — this was
  // the one public lead-capture endpoint with no throttling at all.
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`lp-lead:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    await connectDB();

    const body = await req.json();
    const { name, phone, email, fields, variant } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, message: 'Name and phone are required' },
        { status: 400 }
      );
    }

    if (!isValidIndianMobile(phone)) {
      return NextResponse.json({ success: false, message: INVALID_MOBILE_MESSAGE }, { status: 400 });
    }
    const formattedPhone = normalizePhone(phone);

    const lp = await (LandingPage as any).findOne({ slug: params.slug, status: 'published' }).lean() as any;

    if (!lp) {
      return NextResponse.json(
        { success: false, message: 'Landing page not found' },
        { status: 404 }
      );
    }

    // LP forms don't collect a dedicated service/location pair the way the
    // main /book flow does — infer sensible values so this lead lands in
    // the same Leads/Booking Leads pipeline as everything else instead of
    // a separate, admin-invisible collection.
    const locationSection = (lp.sections || []).find(
      (s: any) => s.type === 'location' && s.visible
    );
    const location = locationSection?.data?.city || '';

    // Any custom fields beyond the standard name/phone/email get preserved
    // as notes rather than silently dropped.
    const extraFields = Object.entries(fields || {}).filter(
      ([key]) => !['name', 'full-name', 'phone', 'mobile', 'tel', 'email'].includes(key)
    );
    const notes = extraFields.length
      ? extraFields.map(([k, v]) => `${k}: ${v}`).join('\n')
      : '';

    // Idempotency — same client-generated key contract as app/api/booking/
    // route.ts (see that file's own comment, and app/lib/bookingIdempotency.ts
    // for the shared mechanism). Landing pages are a real ad-destination —
    // exactly the surface most likely to get a slow-network double-tap.
    const idempotencyKey = normalizeIdempotencyKey(req.headers.get('idempotency-key'));
    const service = lp.title || 'Landing Page Enquiry';
    if (idempotencyKey) {
      const preExisting = await (Booking as any).findOne({ idempotencyKey }).lean();
      if (preExisting) {
        const incomingIdentity = extractIdentity({ name, phone: formattedPhone, service, location, date: '', time: '' });
        if (!identitiesMatch(extractIdentity(preExisting), incomingIdentity)) {
          return NextResponse.json(
            { success: false, code: 'IDEMPOTENCY_CONFLICT', message: 'This request has already been processed.' },
            { status: 409 }
          );
        }
        return NextResponse.json({
          success: true,
          message: lp.form?.successMessage || "Thank you! We'll call you within 2 hours.",
          bookingId: preExisting.bookingId,
        });
      }
    }

    const previousBookings = await (Booking as any).countDocuments({ phone: formattedPhone });

    const bookingId = 'DR-' + Date.now();

    const attribution = buildAttributionFields((name) => req.cookies.get(name)?.value);
    // Same acquisition-source fix as app/api/booking/route.ts — 'landing-page'
    // stays the fallback here specifically (not 'direct'), since it's a real,
    // already-displayed SOURCE_META value and a landing page is itself
    // usually the intended campaign destination even on the rare visit with
    // no UTM/click-id signal at all.
    const resolvedSource = attribution.utmSource || 'landing-page';

    const fieldsToSet = {
      bookingId,
      name,
      phone: formattedPhone,
      formattedPhone,
      email: email || '',
      service,
      location,
      source: resolvedSource,
      conversionChannel: 'website',
      attributionId: req.cookies.get('visitor_id')?.value || '',
      lpSlug: params.slug,
      lpVariant: variant === 'B' ? 'B' : 'A',
      notes,
      isReturnVisit: previousBookings > 0,
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

    // Everything below (CRM push, qualification, VPN flag, analytics
    // counter, WhatsApp alert) only runs for a genuine new creation — a
    // replayed result (the narrow concurrent-same-key race) must never
    // re-trigger any of these, including the analytics.leads counter,
    // which would otherwise double-count a single real visitor.
    if (result.status === 'created') {
      // CRM Connector push — non-blocking, no-ops silently if no CRM
      // connector is configured yet. See app/api/booking/route.ts for the
      // same pattern.
      pushBookingToCrm(booking).catch(() => {});

      // Lead Qualification Engine — same fire-and-forget scoring as the main
      // booking flow (app/api/booking/route.ts); no-ops if not enabled.
      qualifyAndPersist(booking, { reason: 'auto:initial' }).catch(() => {});

      // VPN/proxy/datacenter risk flag — same fire-and-forget pattern as
      // app/api/booking/route.ts; see app/lib/ipIntelligence.ts.
      checkIpRisk(ip).then((r) => {
        if (r.checked) (Booking as any).updateOne({ _id: booking._id }, { $set: { ipRiskFlagged: r.isVpnOrProxy } }).catch(() => {});
      }).catch(() => {});

      // Increment analytics.leads
      const analyticsUpdate: any = { $inc: { 'analytics.leads': 1 } };

      // If A/B test variant B, also increment variantB.leads
      if (variant === 'B') {
        analyticsUpdate.$inc['abTest.variantB.leads'] = 1;
      }

      await (LandingPage as any).findByIdAndUpdate(lp._id, analyticsUpdate);

      // Staff WhatsApp alert — fire-and-forget, same pattern as
      // app/api/leads/route.ts, so a delivery failure never turns an
      // already-saved lead into a failure response for the visitor.
      if (lp.form?.whatsappNotify) {
        getClinicNotifyNumber(location).then((to) => {
          if (!to) return;
          sendWhatsAppText(
            to,
            `🆕 New Landing Page Lead\n\nCampaign: ${lp.title}\nName: ${name}\nPhone: ${formattedPhone}${email ? `\nEmail: ${email}` : ''}${location ? `\nLocation: ${location}` : ''}`
          ).catch(() => {});
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      message: lp.form?.successMessage || "Thank you! We'll call you within 2 hours.",
      // A real Booking row (with this exact bookingId) is created above —
      // previously discarded here, so the client had no way to send the
      // visitor to /book/success/{bookingId} like every other
      // booking-creating flow does (see FormSection.tsx).
      bookingId: booking.bookingId,
    });
  } catch (error) {
    console.error('Lead submission error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to submit lead' },
      { status: 500 }
    );
  }
}
