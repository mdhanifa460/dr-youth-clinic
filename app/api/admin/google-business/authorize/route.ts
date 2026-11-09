import { NextResponse } from 'next/server';
import { requirePermission, getAdminUser } from '@/app/lib/adminAuth';
import { generateSignedState } from '@/app/lib/google/siteVerificationOAuth';
import {
  getBusinessOAuthClient,
  buildBusinessAuthorizationUrl,
  BUSINESS_OAUTH_STATE_COOKIE,
} from '@/app/lib/google/businessProfileOAuth';

export const dynamic = 'force-dynamic';

// Starts "Connect Google" for Business Profile reviews (Admin → Reviews).
// Same signed-state + double-submit cookie flow as Site Verification.
export async function GET() {
  const denied = await requirePermission('reviews', 'full');
  if (denied) return denied;
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  let url: string;
  let state: string;
  try {
    state = generateSignedState({ _id: admin._id, email: admin.email });
    url = buildBusinessAuthorizationUrl(getBusinessOAuthClient(), state);
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Google sign-in is not set up.' },
      { status: 500 }
    );
  }
  const res = NextResponse.redirect(url);
  res.cookies.set(BUSINESS_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax', // 'strict' would drop it on the redirect back from Google
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60,
    path: '/',
  });
  return res;
}
