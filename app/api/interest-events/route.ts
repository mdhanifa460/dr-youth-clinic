import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/app/lib/mongodb';
import { InterestEvent } from '@/app/models/InterestEvent';
import { getSettings } from '@/app/models/Settings';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';
import { EVENT_TYPES } from '@/app/lib/personalization';

const VALID_EVENT_TYPES = new Set<string>(EVENT_TYPES);

// Homepage Personalization Engine — Phase 1. Same trust level as
// /api/assessment-events: public, unauthenticated, no PII, rate-limited
// per IP rather than gated behind auth. visitorId is read server-side from
// the visitor_id cookie (set by middleware.ts) rather than trusted from
// the request body, so a caller can't attribute events to an arbitrary id.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`interest-events:${ip}`, 120, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    await connectDB();

    // Master off-switch (Settings → Personalization, default OFF) — a
    // clinic that hasn't opted in collects nothing at all.
    const settings = await getSettings();
    if (!settings.personalizationEnabled) {
      return NextResponse.json({ success: true });
    }

    const { eventType, category, meta } = await req.json();
    if (!VALID_EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ success: false, message: 'Invalid eventType' }, { status: 400 });
    }
    if (!category || typeof category !== 'string') {
      return NextResponse.json({ success: false, message: 'category is required' }, { status: 400 });
    }

    const visitorId = cookies().get('visitor_id')?.value;
    if (!visitorId) {
      // middleware sets this on every public page — a request with none is
      // almost certainly not a real browser visit; skip rather than store
      // an unattributable row.
      return NextResponse.json({ success: true });
    }

    await InterestEvent.create({
      visitorId,
      category: category.slice(0, 40),
      eventType,
      meta: meta && typeof meta === 'object' ? meta : {},
    });

    return NextResponse.json({ success: true });
  } catch {
    // Never block the page over a tracking failure.
    return NextResponse.json({ success: true });
  }
}
