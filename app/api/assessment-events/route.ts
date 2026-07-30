import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { AssessmentEvent } from '@/app/models/AssessmentEvent';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';

const VALID_EVENTS = new Set([
  'started', 'completed', 'goal_selected', 'step_completed', 'branch_selected', 'service_selected', 'consultation_booked',
]);

// Lightweight, unauthenticated funnel counter. No PII, so a generous rate
// limit is enough to stop trivial abuse without needing the heavier gating
// used on the AI/lead routes. Raised from 30 to 120/hour/IP for the Journey
// Engine merge — a full goal->questions->results journey now fires many
// more events per visit than the old start/complete pair, and a shared
// clinic-kiosk IP can have several visitors in the same hour.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`assessment-events:${ip}`, 120, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    const { event, primaryConcern, campaign, qrSource, clinicLocation, channel, goal, stepId, sessionId } = await req.json();
    if (!VALID_EVENTS.has(event)) {
      return NextResponse.json({ success: false, message: 'Invalid event' }, { status: 400 });
    }

    await connectDB();
    await AssessmentEvent.create({
      event,
      primaryConcern: primaryConcern || '',
      campaign: campaign || '',
      qrSource: !!qrSource,
      clinicLocation: clinicLocation || '',
      channel: channel || '',
      goal: goal || '',
      stepId: stepId || '',
      sessionId: sessionId || '',
    });

    return NextResponse.json({ success: true });
  } catch {
    // Never block the assessment flow over a tracking failure.
    return NextResponse.json({ success: true });
  }
}
