import { NextRequest, NextResponse } from 'next/server';
import { getBusinessCredentialSummary } from '@/app/lib/google/businessProfileOAuth';
import { runBusinessProfileSync, GbpError } from '@/app/lib/reviews/businessProfileSync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Daily Google Business Profile review import (scheduled in vercel.json).
// Does nothing until an admin has connected Google and matched listings.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const summary = await getBusinessCredentialSummary();
    if (!summary.connected) {
      return NextResponse.json({ success: true, message: 'Google Business Profile not connected; nothing to do.' });
    }
    const result = await runBusinessProfileSync();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    if (!(err instanceof GbpError)) console.error('[cron google-reviews]', err instanceof Error ? err.message : err);
    const message = err instanceof GbpError ? err.message : 'Google review sync failed.';
    return NextResponse.json({ success: false, message });
  }
}
