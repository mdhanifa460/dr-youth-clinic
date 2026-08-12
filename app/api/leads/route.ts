import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Lead } from '@/app/models/Lead';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';
import { normalizePhone } from '@/app/lib/phone';
import { getClinicNotifyNumber } from '@/app/lib/clinicNotify';
import { sendWhatsAppText } from '@/app/lib/whatsapp';
import { buildAttributionFields } from '@/app/lib/utmAttribution';

// `to` is resolved per-lead by the caller via getClinicNotifyNumber() (the
// lead's preferred/attributed clinic branch, falling back to the global
// CLINIC_PHONE) — this used to always notify the single global number
// regardless of which branch the patient actually picked.
function notifyClinicWhatsApp(body: string, to: string | undefined) {
  // Fire-and-forget — never block the response on the clinic's own notification.
  if (!to) return;
  sendWhatsAppText(to, body).then((r) => {
    if (!r.success) console.log('❌ Lead clinic WhatsApp alert failed:', r.error);
  });
}

// ── POST — Clinical Intake Step 2: capture the lead immediately (name,
// phone, preferred clinic only — no email, no quiz answers yet). The clinic
// gets notified right away even if the patient abandons the rest of the flow.
export async function POST(req: NextRequest) {
  // 5 leads per hour per IP
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`leads:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    const { name, phone, preferredClinic, city, source, campaign, qrSource, clinicLocation, channel } = await req.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, message: 'Name is required' }, { status: 400 });
    }
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json({ success: false, message: 'Mobile number is required' }, { status: 400 });
    }

    await connectDB();

    // Normalized the same way Booking.phone is (app/lib/phone.ts) — otherwise
    // this and a booking phone can never be compared for equality, and the
    // Analytics "Booking Rate" would never find a match even for a real conversion.
    const normalizedPhone = normalizePhone(phone);

    const lead = await Lead.create({
      name: name.trim(),
      phone: normalizedPhone,
      preferredClinic: preferredClinic || '',
      city: city || '',
      source: source || 'skin-quiz',
      campaign: campaign || '',
      qrSource: !!qrSource,
      clinicLocation: clinicLocation || '',
      channel: channel || '',
      ...buildAttributionFields((name) => req.cookies.get(name)?.value),
    });

    getClinicNotifyNumber(preferredClinic || clinicLocation).then((to) => {
      notifyClinicWhatsApp(
        `📋 New Clinical Intake Lead\n\nName: ${name.trim()}\nPhone: ${phone}${preferredClinic ? `\nPreferred Clinic: ${preferredClinic}` : ''}\n\nStill completing their intake form.`,
        to
      );
    }).catch(() => {});

    return NextResponse.json({ success: true, leadId: String(lead._id) });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Failed' }, { status: 500 });
  }
}

// ── PATCH — Clinical Intake Results: attach the completed answers to the
// Step-2 lead. "Email me a copy" (which used to email a treatment/price
// table straight to the patient) was removed along with Treatment Mapping —
// no replacement content was built for it, so the feature is gone rather
// than emailing an empty table.
export async function PATCH(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`leads-patch:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    const {
      leadId, answers, primaryConcern,
      // Pre-Consultation Assessment (Hair/Skin/Body + Plan My Journey) —
      // additive. Never includes a treatment name; see
      // app/lib/assessmentTypeScoring.ts / app/lib/assessmentScoring.ts.
      assessmentType, assessmentResult,
    } = await req.json();
    if (!leadId || typeof leadId !== 'string') {
      return NextResponse.json({ success: false, message: 'leadId is required' }, { status: 400 });
    }

    await connectDB();

    const hasIntakeData = answers !== undefined || primaryConcern !== undefined;
    const hasAssessmentResult = assessmentType !== undefined || assessmentResult !== undefined;
    const concern = primaryConcern || answers?.concern || '';

    if (!hasIntakeData && !hasAssessmentResult) {
      return NextResponse.json({ success: false, message: 'Nothing to update' }, { status: 400 });
    }

    const lead = await (Lead as any).findByIdAndUpdate(
      leadId,
      {
        $set: {
          ...(hasIntakeData ? { primaryConcern: concern, answers: answers || {} } : {}),
          ...(hasAssessmentResult ? {
            assessmentType: assessmentType || '',
            assessmentResult: assessmentResult || {},
            answers: answers || {},
            // Top category label (e.g. "Hair Fall Impact") — kept in the
            // same primaryConcern field the legacy flow uses, purely so
            // existing lead-list views show something meaningful; never a
            // treatment name, since assessmentResult never contains one.
            primaryConcern: [...(assessmentResult?.categoryScores || [])].sort((x: any, y: any) => y.percent - x.percent)[0]?.label || '',
          } : {}),
        },
      },
      { returnDocument: 'after', runValidators: true }
    );
    if (!lead) {
      return NextResponse.json({ success: false, message: 'Lead not found' }, { status: 404 });
    }

    if (hasIntakeData && !hasAssessmentResult) {
      getClinicNotifyNumber(lead.preferredClinic || lead.clinicLocation).then((to) => {
        notifyClinicWhatsApp(
          `✅ Clinical Intake Completed\n\nName: ${lead.name || 'Unknown'}\nPhone: ${lead.phone || 'Unknown'}\nConcern: ${concern || 'Unknown'}`,
          to
        );
      }).catch(() => {});
    }

    // Deliberately no treatment name in this alert — matches the same
    // boundary enforced in the API response and result screen.
    if (hasAssessmentResult) {
      const ar = assessmentResult || {};
      getClinicNotifyNumber(lead.preferredClinic || lead.clinicLocation).then((to) => {
        notifyClinicWhatsApp(
          `✅ ${(assessmentType || 'Pre-consultation').toString().replace(/^\w/, (c: string) => c.toUpperCase())} Assessment Completed\n\nName: ${lead.name || 'Unknown'}\nPhone: ${lead.phone || 'Unknown'}\nOverall Concern: ${ar.overallConcern ?? 'N/A'}% (${ar.severity || 'N/A'})\nRisk Level: ${ar.riskLevel || 'N/A'}`,
          to
        );
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Failed' }, { status: 500 });
  }
}
