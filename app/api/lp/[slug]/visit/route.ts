import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { connectDB } from '@/app/lib/mongodb';
import { LandingPage } from '@/app/models/LandingPage';
import { LandingPageVisit } from '@/app/models/LandingPageVisit';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';
import { UTM_LAST_COOKIE, parseUtmCookie } from '@/app/lib/utmAttribution';

export const dynamic = 'force-dynamic';

// Quick device split from the UA string — good enough to group visits by
// mobile/tablet/desktop without pulling in a UA-parsing library for it.
function detectDevice(ua: string): 'mobile' | 'tablet' | 'desktop' | 'unknown' {
  if (!ua) return 'unknown';
  if (/ipad|tablet/i.test(ua)) return 'tablet';
  if (/mobile|iphone|android/i.test(ua)) return 'mobile';
  return 'desktop';
}

// Public endpoint — no auth required. Increments visitor count and, since
// that counter had nothing an admin could click into, logs the individual
// visit (app/models/LandingPageVisit.ts) so "247 visitors" can be opened
// into an actual list. Limit is generous (real visitors browsing several
// landing pages shouldn't hit it) — just enough to stop a script from
// inflating analytics for free.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`lp-visit:${ip}`, 30, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    await connectDB();
    const page = await (LandingPage as any).findOneAndUpdate(
      { slug: params.slug, status: 'published' },
      { $inc: { 'analytics.visitors': 1 } },
      { new: true }
    );
    if (page) {
      const touch = parseUtmCookie(req.cookies.get(UTM_LAST_COOKIE)?.value);
      const ipHash = ip ? createHash('sha256').update(ip).digest('hex').slice(0, 32) : '';
      (LandingPageVisit as any)
        .create({
          landingPageId: page._id,
          slug: params.slug,
          source: touch?.source || '',
          medium: touch?.medium || '',
          campaign: touch?.campaign || '',
          referrer: (req.headers.get('referer') || '').slice(0, 300),
          device: detectDevice(req.headers.get('user-agent') || ''),
          ipHash,
        })
        .catch(() => {});
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
