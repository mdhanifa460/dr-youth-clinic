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
      <h1 style="margin:8px 0 0;color:#fff;font-size:22px;">Your Personalised Treatment Plan</h1>
    </div>
    <div style="background:#fff;padding:24px;">
      <p style="margin:0 0 16px;font-size:14px;color:#374151;">Based on your AI skin & hair assessment, here's what we'd recommend exploring for <strong>${concern || 'your concern'}</strong>:</p>
      <table style="width:100%;border-collapse:collapse;">${treatmentRows}</table>
      <div style="text-align:center;margin-top:24px;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/book" style="display:inline-block;background:#F5A623;color:#0B2560;font-weight:700;font-size:14px;padding:14px 28px;border-radius:12px;text-decoration:none;">Book Your Free Consultation</a>
      </div>
      <p style="margin:20px 0 0;font-size:11px;color:#9ca3af;text-align:center;">Your exact treatment plan will be confirmed by a doctor at consultation.</p>
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
        subject: 'Your Personalised Treatment Plan — DR Youth Clinic',
        html: planEmailHtml(concern, recommendations),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  // 5 leads per hour per IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(`leads:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    const { name, phone, email, city, source, campaign, qrSource, clinicLocation, channel, answers, recommendations, primaryConcern } = await req.json();
    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ success: false, message: 'Valid email is required' }, { status: 400 });
    }

    await connectDB();

    const recs = Array.isArray(recommendations) ? recommendations : [];
    const concern = primaryConcern || answers?.concern || '';
    const emailSent = await sendPlanEmail(email.trim(), concern, recs);

    // Normalized the same way Booking.phone is (app/lib/phone.ts) — otherwise
    // this and a booking phone can never be compared for equality, and the
    // Analytics "Booking Rate" would never find a match even for a real conversion.
    const normalizedPhone = phone ? normalizePhone(phone) : '';

    await Lead.create({
      name: name || '',
      phone: normalizedPhone,
      email: email.trim(),
      city: city || '',
      source: source || 'skin-quiz',
      campaign: campaign || '',
      qrSource: !!qrSource,
      clinicLocation: clinicLocation || '',
      channel: channel || '',
      primaryConcern: concern,
      answers,
      recommendations: recs,
      emailSent,
    });

    // Notify clinic via WhatsApp (fire-and-forget — don't block response)
    if (process.env.WHATSAPP_TOKEN && process.env.PHONE_NUMBER_ID && process.env.CLINIC_PHONE) {
      const recNames = recs.map((r: any) => (typeof r === 'string' ? r : r?.name)).filter(Boolean).join(', ');
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
          text: {
            body: `📊 AI Assessment Lead\n\n${name ? `Name: ${name}\n` : ''}${phone ? `Phone: ${phone}\n` : ''}Email: ${email}\nConcern: ${concern || 'Unknown'}\nRecommended: ${recNames || 'N/A'}`,
          },
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, emailSent });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Failed' }, { status: 500 });
  }
}
