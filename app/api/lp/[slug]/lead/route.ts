import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { LandingPage } from '@/app/models/LandingPage';
import { LandingPageLead } from '@/app/models/LandingPageLead';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  // Same 5/hour/IP limit as the equivalent app/api/leads/route.ts — this was
  // the one public lead-capture endpoint with no throttling at all.
  const ip = getClientIp(req);
  const rl = checkRateLimit(`lp-lead:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    await connectDB();

    const body = await req.json();
    const { name, phone, email, fields, variant } = body;

    const lp = await (LandingPage as any).findOne({ slug: params.slug, status: 'published' }).lean() as any;

    if (!lp) {
      return NextResponse.json(
        { success: false, message: 'Landing page not found' },
        { status: 404 }
      );
    }

    // Save lead
    const lead = new LandingPageLead({
      lpId: lp._id,
      slug: params.slug,
      variant: variant === 'B' ? 'B' : 'A',
      name: name || '',
      phone: phone || '',
      email: email || '',
      fields: fields || {},
    });
    await lead.save();

    // Increment analytics.leads
    const analyticsUpdate: any = { $inc: { 'analytics.leads': 1 } };

    // If A/B test variant B, also increment variantB.leads
    if (variant === 'B') {
      analyticsUpdate.$inc['abTest.variantB.leads'] = 1;
    }

    await (LandingPage as any).findByIdAndUpdate(lp._id, analyticsUpdate);

    // WhatsApp notification if configured
    if (lp.form?.whatsappNotify) {
      const whatsappNumber = process.env.WHATSAPP_NOTIFY_NUMBER;
      if (whatsappNumber) {
        const message = encodeURIComponent(
          `New lead from ${lp.title}!\nName: ${name || 'N/A'}\nPhone: ${phone || 'N/A'}\nEmail: ${email || 'N/A'}`
        );
        // Fire-and-forget — don't block the response
        fetch(`https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${message}`).catch(() => {});
      }
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
