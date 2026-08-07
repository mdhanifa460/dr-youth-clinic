import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { LandingPage } from '@/app/models/LandingPage';
import Booking from '@/app/models/Booking';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';
import { normalizePhone } from '@/app/lib/phone';
import { getClinicNotifyNumber } from '@/app/lib/clinicNotify';
import { sendWhatsAppText } from '@/app/lib/whatsapp';

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

    const formattedPhone = normalizePhone(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      return NextResponse.json({ success: false, message: 'Invalid phone number' }, { status: 400 });
    }

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

    const previousBookings = await (Booking as any).countDocuments({ phone: formattedPhone });

    const bookingId = 'DR-' + Date.now();

    await Booking.create({
      bookingId,
      name,
      phone: formattedPhone,
      formattedPhone,
      email: email || '',
      service: lp.title || 'Landing Page Enquiry',
      location,
      source: 'landing-page',
      lpSlug: params.slug,
      lpVariant: variant === 'B' ? 'B' : 'A',
      notes,
      isReturnVisit: previousBookings > 0,
    });

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

    return NextResponse.json({
      success: true,
      message: lp.form?.successMessage || "Thank you! We'll call you within 2 hours.",
    });
  } catch (error) {
    console.error('Lead submission error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to submit lead' },
      { status: 500 }
    );
  }
}
