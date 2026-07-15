import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Newsletter } from '@/app/models/Newsletter';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function welcomeEmailHtml() {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;background:#f6faff;padding:24px;">
    <div style="background:#0B2560;border-radius:16px 16px 0 0;padding:28px 24px;text-align:center;">
      <p style="margin:0;color:#F5A623;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">DR Youth Clinic</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:22px;">You're Subscribed!</h1>
    </div>
    <div style="background:#fff;padding:24px;border-radius:0 0 16px 16px;">
      <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">Thanks for subscribing to the DR Youth Clinic Medical Knowledge Center. You'll get expert skin & hair tips, treatment guides, and offers straight to your inbox.</p>
      <div style="text-align:center;margin-top:8px;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/blog" style="display:inline-block;background:#F5A623;color:#0B2560;font-weight:700;font-size:14px;padding:14px 28px;border-radius:12px;text-decoration:none;">Browse the Knowledge Center</a>
      </div>
    </div>
  </div>`;
}

async function sendWelcomeEmail(email: string): Promise<boolean> {
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
        subject: "You're Subscribed — DR Youth Clinic",
        html: welcomeEmailHtml(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  // 5 signups per hour per IP — same limit as /api/leads
  const ip = getClientIp(req);
  const rl = checkRateLimit(`newsletter:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    const { email, name, source } = await req.json();
    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ success: false, message: 'Valid email is required' }, { status: 400 });
    }

    await connectDB();

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await (Newsletter as any).findOne({ email: normalizedEmail }).lean();

    if (!existing) {
      await Newsletter.create({ email: normalizedEmail, name: name || '', source: source || 'blog' });
      // Fire-and-forget — the client only needs the DB write to succeed to
      // show "You're subscribed!"; waiting on Resend's API here would add
      // its full round-trip latency to every signup for no visible benefit.
      sendWelcomeEmail(normalizedEmail).catch(() => {});
      return NextResponse.json({ success: true });
    }

    // Already subscribed — treat as success (idempotent) rather than an error.
    return NextResponse.json({ success: true, alreadySubscribed: true });
  } catch (err: any) {
    // Log the real cause server-side, but never echo internal error details
    // (e.g. a raw Mongoose connection-string error) back to a public client.
    console.error('[newsletter] subscribe failed:', err);
    return NextResponse.json({ success: false, message: 'Subscription failed — please try again' }, { status: 500 });
  }
}
