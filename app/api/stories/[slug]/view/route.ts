import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Story } from '@/app/models/Story';
import { checkRateLimit, getClientIp } from '@/app/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Public, unauthenticated — fired once per story open from the viewer.
// Rate-limited per IP rather than requiring a session, same tradeoff the
// other public counters in this app (assessment events) already make.
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`story-view:${ip}`, 120, 60 * 60 * 1000);
  if (!rl.allowed) return NextResponse.json({ success: false }, { status: 429 });

  try {
    await connectDB();
    await (Story as any).updateOne({ slug: params.slug, status: 'published' }, { $inc: { viewCount: 1 } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
