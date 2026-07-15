import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Lead } from '@/app/models/Lead';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';
import { normalizePhone } from '@/app/lib/phone';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function planEmailHtml(concern: string, recommendations: any[]) {
  const treatmentRows = recommendations
    .map(
      (r: any) => `
        <tr>
          <td style="padding:16px;border-bottom:1px solid #eef2f7;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0B2560;">${r.icon ? r.icon + ' ' : ''}${r.name ?? ''}</p>
            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.5;">${r.description ?? r.desc ?? ''}</p>
            <p style="margin:0;font-size:12px;color:#3B82C4;font-weight:600;">${[r.sessions, r.price].filter(Boolean).join(' · ')}</p>
          </td>
        </tr>`
    )
    .join('');

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;background:#f6faff;padding:24px;">
    <div style="background:#0B2560;border-radius:16px 16px 0 0;padding:28px 24px;text-align:center;">
      <p style="margin:0;color:#F5A623;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">DR Youth Clinic</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:22px;">Your Clinical Intake Report</h1>
    </div>
    <div style="background:#fff;padding:24px;">
      <p style="margin:0 0 16px;font-size:14px;color:#374151;">Based on your intake for <strong>${concern || 'your concern'}</strong>, here are possible discussion topics for your doctor to evaluate at consultation:</p>
      <table style="width:100%;border-collapse:collapse;">${treatmentRows}</table>
      <div style="text-align:center;margin-top:24px;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/book" style="display:inline-block;background:#F5A623;color:#0B2560;font-weight:700;font-size:14px;padding:14px 28px;border-radius:12px;text-decoration:none;">Book Your Free Consultation</a>
      </div>
      <p style="margin:20px 0 0;font-size:11px;color:#9ca3af;text-align:center;">This report is educational and does not replace a doctor's consultation. Your treatment plan will be confirmed by a doctor after evaluation.</p>
    </div>
  </div>`;
}

async function sendPlanEmail(email: string, concern: string, recommendations: any[]): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'DR Youth Clinic <onboarding@resend.dev>',
        to: [email],
        subject: 'Your Clinical Intake Report — DR Youth Clinic',
        html: planEmailHtml(concern, recommendations),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function notifyClinicWhatsApp(body: string) {
  // Fire-and-forget — never block the response on the clinic's own notification.
  if (!(process.env.WHATSAPP_TOKEN && process.env.PHONE_NUMBER_ID && process.env.CLINIC_PHONE)) return;
  fetch(`https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: process.env.CLINIC_PHONE,
      type: 'text',
      text: { body },
    }),
  }).catch(() => {});
}

// ── POST — Clinical Intake Step 2: capture the lead immediately (name,
// phone, preferred clinic only — no email, no quiz answers yet). The clinic
// gets notified right away even if the patient abandons the rest of the flow.
export async function POST(req: NextRequest) {
  // 5 leads per hour per IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(`leads:${ip}`, 5, 60 * 60 * 1000);
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
    });

    notifyClinicWhatsApp(
      `📋 New Clinical Intake Lead\n\nName: ${name.trim()}\nPhone: ${phone}${preferredClinic ? `\nPreferred Clinic: ${preferredClinic}` : ''}\n\nStill completing their intake form.`
    );

    return NextResponse.json({ success: true, leadId: String(lead._id) });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Failed' }, { status: 500 });
  }
}

// ── PATCH — Clinical Intake Results: attach the completed answers/
// recommendations to the Step-2 lead, and optionally an email if the
// patient chose the non-blocking "email me a copy" option.
export async function PATCH(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`leads-patch:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    const { leadId, answers, recommendations, primaryConcern, email } = await req.json();
    if (!leadId || typeof leadId !== 'string') {
      return NextResponse.json({ success: false, message: 'leadId is required' }, { status: 400 });
    }
    if (email && (typeof email !== 'string' || !EMAIL_RE.test(email.trim()))) {
      return NextResponse.json({ success: false, message: 'Invalid email format' }, { status: 400 });
    }

    await connectDB();

    // Two distinct callers share this endpoint: the Results screen attaches
    // the completed intake (answers/recommendations/primaryConcern) once,
    // and the separate "email me a copy" box may PATCH again later with
    // only { leadId, email }. Only touch the intake fields when this call
    // actually carries them, so a later email-only PATCH can't wipe out
    // intake data that was already saved by the first call.
    const hasIntakeData = answers !== undefined || recommendations !== undefined || primaryConcern !== undefined;
    const recs = Array.isArray(recommendations) ? recommendations : [];
    const concern = primaryConcern || answers?.concern || '';

    const existingLead = hasIntakeData ? null : await (Lead as any).findById(leadId).lean();
    if (!hasIntakeData && !existingLead) {
      return NextResponse.json({ success: false, message: 'Lead not found' }, { status: 404 });
    }
    const emailConcern = hasIntakeData ? concern : (existingLead?.primaryConcern || '');
    const emailRecs = hasIntakeData ? recs : (Array.isArray(existingLead?.recommendations) ? existingLead.recommendations : []);

    let emailSent = false;
    if (email) {
      emailSent = await sendPlanEmail(email.trim(), emailConcern, emailRecs);
    }

    const lead = await (Lead as any).findByIdAndUpdate(
      leadId,
      {
        $set: {
          ...(email ? { email: email.trim(), emailSent } : {}),
          ...(hasIntakeData ? { primaryConcern: concern, answers: answers || {}, recommendations: recs } : {}),
        },
      },
      { new: true, runValidators: true }
    );
    if (!lead) {
      return NextResponse.json({ success: false, message: 'Lead not found' }, { status: 404 });
    }

    if (hasIntakeData) {
      const recNames = recs.map((r: any) => (typeof r === 'string' ? r : r?.name)).filter(Boolean).join(', ');
      notifyClinicWhatsApp(
        `✅ Clinical Intake Completed\n\nName: ${lead.name || 'Unknown'}\nPhone: ${lead.phone || 'Unknown'}\nConcern: ${concern || 'Unknown'}\nPossible discussion topics: ${recNames || 'N/A'}`
      );
    }

    return NextResponse.json({ success: true, emailSent });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Failed' }, { status: 500 });
  }
}
