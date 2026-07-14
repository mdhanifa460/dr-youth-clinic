import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { LandingPage } from '@/app/models/LandingPage';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Public endpoint — no auth required. Increments visitor count only. Limit
// is generous (real visitors browsing several landing pages shouldn't hit
// it) — just enough to stop a script from inflating analytics for free.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`lp-visit:${ip}`, 30, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    await connectDB();
    await (LandingPage as any).findOneAndUpdate(
      { slug: params.slug, status: 'published' },
      { $inc: { 'analytics.visitors': 1 } }
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
