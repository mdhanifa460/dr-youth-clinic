import { NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';

// TEMPORARY diagnostic route — checks whether Vercel injects
// VERCEL_OIDC_TOKEN into a live Production Function invocation for this
// project (Phase 2 of the WIF migration plan), without ever exposing the
// raw token itself. Decodes only the JWT payload (public claims, not a
// secret by themselves) to report issuer/subject/audience/environment.
// Meant to be removed immediately after one confirmed check — not part
// of the app's real functionality.
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

export async function GET() {
  const denied = await requirePermission('settings', 'full');
  if (denied) return denied;

  const token = process.env.VERCEL_OIDC_TOKEN;
  if (!token) {
    return NextResponse.json({ present: false });
  }

  const claims = decodeJwtPayload(token);
  return NextResponse.json({
    present: true,
    claims: claims
      ? {
          iss: claims.iss,
          sub: claims.sub,
          aud: claims.aud,
          owner: claims.owner,
          owner_id: claims.owner_id,
          project: claims.project,
          project_id: claims.project_id,
          environment: claims.environment,
        }
      : null,
  });
}
