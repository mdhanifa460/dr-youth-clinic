import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { LandingPage } from '@/app/models/LandingPage';
import Booking from '@/app/models/Booking';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';
import { normalizePhone, isValidIndianMobile } from '@/app/lib/phone';
import { buildAttributionFields } from '@/app/lib/utmAttribution';

// Abandoned-form recovery — a visitor who typed their own name/phone into
// an LP form but left before hitting Submit currently has that data
// thrown away completely. This is the honest alternative to a silent
// visitor-deanonymization tool: it only ever captures what the visitor
// typed into the form themselves, and every record it creates is
// explicitly tagged isPartial so staff follow up with "we noticed you
// were checking out our site..." rather than treating it as a completed
// booking. Called fire-and-forget from the client (see HeroSection.tsx/
// FormSection.tsx's own onBlur/beforeunload handlers) — must never
// surface an error to the visitor, since this is a background save, not
// a real submission action they took.
//
// Deliberately skips everything the real /lead route does beyond saving
// the record itself — no CRM push, no lead-qualification scoring, no
// staff WhatsApp alert, no analytics.leads counter increment. Firing a
// staff alert on every abandoned blur would be noisy and would count a
// non-conversion as a lead in LP analytics, which is exactly the number
// this feature exists to eventually recover, not inflate.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  // Slightly more generous than the real /lead route's 5/hour — this can
  // legitimately fire more than once per visitor (blur + beforeunload
  // both calling it, or an admin form retry), and each call is much
  // cheaper (no CRM/WhatsApp/qualification work) than a real submission.
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`lp-partial-lead:${ip}`, 15, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    await connectDB();

    const body = await req.json();
    const { name, phone, email } = body;

    // Phone is the one genuinely required signal — a name-only partial
    // (no way to ever contact them) isn't worth persisting at all.
    if (!phone || !isValidIndianMobile(phone)) {
      return NextResponse.json({ success: false }, { status: 200 });
    }
    const formattedPhone = normalizePhone(phone);

    const lp = await (LandingPage as any).findOne({ slug: params.slug, status: 'published' }).select('title sections').lean() as any;
    if (!lp) return NextResponse.json({ success: false }, { status: 200 });

    const locationSection = (lp.sections || []).find((s: any) => s.type === 'location' && s.visible);
    const location = locationSection?.data?.city || '';
    const service = lp.title || 'Landing Page Enquiry';
    const attribution = buildAttributionFields((n) => req.cookies.get(n)?.value);

    // Same-visitor dedup: if this exact phone number already has a
    // partial (or real) record for this LP within the last 24h, update it
    // in place rather than creating a new document every time they blur a
    // field — a visitor correcting a typo or blurring twice shouldn't
    // create multiple rows. 24h, not "forever," so a genuinely new visit
    // days later starts fresh rather than silently reusing a stale record.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await (Booking as any).findOne({
      formattedPhone,
      lpSlug: params.slug,
      createdAt: { $gte: since },
    }).lean();

    if (existing) {
      // Never downgrade a real, completed submission back to "partial" —
      // this only ever updates a record that's still genuinely partial.
      if (!existing.isPartial) return NextResponse.json({ success: true });
      await (Booking as any).updateOne(
        { _id: existing._id },
        { $set: { name: name || existing.name, email: email || existing.email, partialSavedAt: new Date() } }
      );
      return NextResponse.json({ success: true });
    }

    const bookingId = 'DR-' + Date.now();
    await (Booking as any).create({
      bookingId,
      name: name || '',
      phone: formattedPhone,
      formattedPhone,
      email: email || '',
      service,
      location,
      source: attribution.utmSource || 'landing-page',
      conversionChannel: 'website',
      attributionId: req.cookies.get('visitor_id')?.value || '',
      lpSlug: params.slug,
      isPartial: true,
      partialSavedAt: new Date(),
      ...attribution,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Fire-and-forget from the client — logging only, never a visible
    // error, since this is a background save the visitor never asked for
    // and must never notice failing.
    console.error('Partial lead capture error:', error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
