import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';
import { getStoredCredentialSummary } from '@/app/lib/google/siteVerificationOAuth';

export const dynamic = 'force-dynamic';

// Read-only status check — never returns access_token/refresh_token, only
// the redacted summary from redactCredentialForClient().
export async function GET(_req: NextRequest) {
  const denied = await requirePermission('settings', 'view');
  if (denied) return denied;

  try {
    const summary = await getStoredCredentialSummary();
    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    console.error('[google-site-verification] status check failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, message: 'Could not check Google Site Verification status.' }, { status: 500 });
  }
}
