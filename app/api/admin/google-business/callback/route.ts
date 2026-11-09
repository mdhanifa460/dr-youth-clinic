import { NextRequest, NextResponse } from 'next/server';
import { verifySignedState } from '@/app/lib/google/siteVerificationOAuth';
import { completeBusinessAuthorization, BUSINESS_OAUTH_STATE_COOKIE } from '@/app/lib/google/businessProfileOAuth';

export const dynamic = 'force-dynamic';

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

function resultPage(ok: boolean, message: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google Business Profile</title></head>
<body style="font-family:system-ui,sans-serif;max-width:520px;margin:64px auto;padding:0 24px;color:#0B2560;">
<h1 style="color:${ok ? '#1E8E5A' : '#B8480A'};font-size:1.4rem;">${ok ? 'Connected' : 'Could not connect'}</h1>
<p style="color:#4A5578;line-height:1.6;">${escapeHtml(message)}</p>
<p><a href="/admin/reviews" style="color:#0B2560;">Back to Admin → Reviews</a></p>
</body></html>`;
  return new NextResponse(html, { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// Reached only through Google's cross-site redirect, where the Strict admin
// session cookie is withheld (middleware.ts lets this exact path through).
// Proof of the admin comes from the signed state + Lax double-submit
// cookie, exactly as in the Site Verification callback.
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const cookie = req.cookies.get(BUSINESS_OAUTH_STATE_COOKIE)?.value;
  const done = (res: NextResponse) => {
    res.cookies.set(BUSINESS_OAUTH_STATE_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  };

  const googleError = params.get('error');
  if (googleError) return done(resultPage(false, `Google reported: ${googleError}. Nothing was changed.`));
  const code = params.get('code');
  if (!code) return done(resultPage(false, 'Google did not return a sign-in code. Please try again.'));

  const state = params.get('state');
  if (!state || !cookie || state !== cookie) {
    return done(resultPage(false, 'This sign-in link is invalid or expired. Please start again from Admin → Reviews.'));
  }
  const verified = verifySignedState(state);
  if (!verified.valid || !verified.adminId || !verified.adminEmail) {
    return done(resultPage(false, 'This sign-in link is invalid or expired. Please start again from Admin → Reviews.'));
  }

  try {
    const result = await completeBusinessAuthorization(code, { _id: verified.adminId, email: verified.adminEmail });
    if (result.ok === false) return done(resultPage(false, result.message));
  } catch (err) {
    console.error('[google-business] callback failed:', err instanceof Error ? err.message : err);
    return done(resultPage(false, err instanceof Error ? err.message : 'Something went wrong while connecting.'));
  }
  return done(resultPage(true, 'Google Business Profile is connected. Go back to Admin → Reviews, load your listings and match each one to a branch.'));
}
