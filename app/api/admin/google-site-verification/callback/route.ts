import { NextRequest, NextResponse } from 'next/server';
import { verifySignedState, completeAuthorization, OAUTH_STATE_COOKIE } from '@/app/lib/google/siteVerificationOAuth';

export const dynamic = 'force-dynamic';

// Minimal, dependency-free result page — this route is only ever reached
// via a full browser navigation (Google's own redirect), so a human reads
// this directly; no admin UI page exists (or was requested) for this
// feature. Never includes any token/secret value, only a message.
function resultPage(status: 'ok' | 'error', message: string) {
  const color = status === 'ok' ? '#1E8E5A' : '#B8480A';
  const heading = status === 'ok' ? 'Connected' : 'Could not connect';
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Google Site Verification</title></head>
<body style="font-family:system-ui,sans-serif;max-width:520px;margin:64px auto;padding:0 24px;color:#0B2560;">
<h1 style="color:${color};font-size:1.4rem;">${heading}</h1>
<p style="color:#4A5578;line-height:1.6;">${message}</p>
<p><a href="/admin/settings/analytics" style="color:#0B2560;">Return to Analytics &amp; Tracking settings</a></p>
</body></html>`;
  return new NextResponse(html, {
    status: status === 'ok' ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// No requirePermission()/getAdminUser() here on purpose — this route is
// only ever reached via Google's own cross-site redirect, on which the
// SameSite=Strict admin_session cookie is withheld by every browser (see
// middleware.ts's matching exact-path exception for the same route, and
// its own comment for the full explanation). The admin's identity is
// carried instead inside the signed `state` value itself — embedded at
// /authorize time, where the session cookie DOES work correctly — and
// verified below via verifySignedState(), which checks the HMAC signature
// (tamper-proof), the expiry window (anti-replay), AND is matched against
// the separate gsv_oauth_state double-submit cookie (SameSite=Lax, which
// DOES survive this redirect). That combination is what actually proves
// this request is a genuine continuation of an authenticated /authorize
// call — not a weaker check than the session cookie, a different one that
// actually works for this specific cross-site-redirect shape.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stateCookie = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

  // Clear the state cookie on every path below — it's single-use
  // regardless of outcome, preventing any replay of the same state value.
  const clearStateCookie = (res: NextResponse) => {
    res.cookies.set(OAUTH_STATE_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  };

  // Google redirects here with `error` instead of `code` when the admin
  // declines consent — a normal outcome, not a bug.
  const googleError = searchParams.get('error');
  if (googleError) {
    return clearStateCookie(resultPage('error', `Google reported: ${googleError}. No changes were made.`));
  }

  const code = searchParams.get('code');
  if (!code) {
    return clearStateCookie(resultPage('error', 'Google did not return an authorization code. Please try connecting again.'));
  }

  const state = searchParams.get('state');
  if (!state || !stateCookie || state !== stateCookie) {
    console.error('[google-site-verification] state mismatch on callback (possible CSRF or expired session)');
    return clearStateCookie(resultPage('error', 'This authorization link is invalid or expired. Please start over.'));
  }
  const verified = verifySignedState(state);
  if (!verified.valid || !verified.adminId || !verified.adminEmail) {
    console.error('[google-site-verification] state signature invalid:', verified.reason || 'missing embedded admin identity');
    return clearStateCookie(resultPage('error', 'This authorization link is invalid or expired. Please start over.'));
  }

  let result;
  try {
    result = await completeAuthorization(code, { _id: verified.adminId, email: verified.adminEmail });
  } catch (err) {
    // getOAuth2ClientFromEnv() throwing (missing env config) lands here —
    // never an unhandled rejection / raw 500, and never a secret in the
    // logged message (see completeAuthorization's own error handling for
    // the token-exchange path).
    console.error('[google-site-verification] callback failed:', err instanceof Error ? err.message : err);
    return clearStateCookie(resultPage('error', err instanceof Error ? err.message : 'Something went wrong completing authorization.'));
  }
  if (!result.ok) {
    return clearStateCookie(resultPage('error', result.message));
  }

  return clearStateCookie(
    resultPage('ok', 'Google Site Verification is now connected. This app can access it on your behalf until access is revoked.')
  );
}
