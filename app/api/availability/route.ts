import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';
import { canonicalizeLocation } from '@/app/lib/locationNormalize';
import { getBranchAvailability } from '@/app/lib/availability';
import { connectDB } from '@/app/lib/mongodb';

export const dynamic = 'force-dynamic';

// Public, unauthenticated — the AI chat widget (and potentially a future
// booking-page widget) needs real availability data without an admin
// session. Read-only, no PII, generous but bounded rate limit (mirrors
// app/api/faq-assistant/route.ts's 20/hr — this is a lighter DB read with
// no AI call, so a bit more headroom is safe).
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`availability:${ip}`, 40, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  const raw = req.nextUrl.searchParams.get('location') || '';
  const location = canonicalizeLocation(raw);
  if (!location) {
    return NextResponse.json(
      { success: false, message: 'A valid clinic location (chennai/bangalore/coimbatore/kochi) is required.' },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const days = await getBranchAvailability(location, 3);
    return NextResponse.json({ success: true, location, days });
  } catch (err) {
    console.error('[availability]', err);
    return NextResponse.json({ success: false, message: 'Could not load availability right now.' }, { status: 500 });
  }
}
