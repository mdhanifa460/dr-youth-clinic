import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { AssessmentEvent } from '@/app/models/AssessmentEvent';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';

// Lightweight, unauthenticated funnel counter — fired once when the
// assessment loads ("started") and once when results are shown
// ("completed"). No PII, so a generous rate limit is enough to stop trivial
// abuse without needing the heavier gating used on the AI/lead routes.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`assessment-events:${ip}`, 30, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    const { event, primaryConcern, campaign, qrSource } = await req.json();
    if (event !== 'started' && event !== 'completed') {
      return NextResponse.json({ success: false, message: 'Invalid event' }, { status: 400 });
    }

    await connectDB();
    await AssessmentEvent.create({
      event,
      primaryConcern: primaryConcern || '',
      campaign: campaign || '',
      qrSource: !!qrSource,
    });

    return NextResponse.json({ success: true });
  } catch {
    // Never block the assessment flow over a tracking failure.
    return NextResponse.json({ success: true });
  }
}
