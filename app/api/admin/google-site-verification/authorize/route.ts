import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, getAdminUser } from '@/app/lib/adminAuth';
import {
  getOAuth2ClientFromEnv,
  buildAuthorizationUrl,
  generateSignedState,
  OAUTH_STATE_COOKIE,
} from '@/app/lib/google/siteVerificationOAuth';

export const dynamic = 'force-dynamic';

// Starts the Google Site Verification OAuth flow. Admin-only — same
// permission gate every /api/admin/* route already uses (see
// app/lib/adminAuth.ts), reused here rather than a second auth system.
export async function GET(_req: NextRequest) {
  const denied = await requirePermission('settings', 'full');
  if (denied) return denied;

  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  let authUrl: string;
  let state: string;
  try {
    const oauth2Client = getOAuth2ClientFromEnv();
    state = generateSignedState();
    authUrl = buildAuthorizationUrl(oauth2Client, state);
  } catch (err) {
    // Missing env config — a clear, actionable message, never a stack
    // trace or a guess at what might be wrong.
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Google OAuth is not configured.' },
      { status: 500 }
    );
  }

  const res = NextResponse.redirect(authUrl);
  // Double-submit CSRF check — the callback requires this cookie to match
  // the `state` Google round-trips back. Short-lived and httpOnly, same
  // convention as the admin session cookie (see adminAuth.ts).
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax', // 'strict' would drop the cookie on the redirect back from accounts.google.com
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60,
    path: '/',
  });
  return res;
}
