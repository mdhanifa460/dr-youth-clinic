import { Redis } from '@upstash/redis';

// Edge-safe mirror of "approved" RedirectMapping rows, read from
// middleware.ts before any page ever renders — the fix for a confirmed,
// pre-existing Next.js 14.2.35 bug where notFound()/redirect() called from
// inside a generateStaticParams()+revalidate (SSG) dynamic route (like
// app/(public)/[location]/page.tsx) doesn't reliably propagate a non-200
// HTTP status. Middleware never touches that page-rendering pipeline at
// all, so this can't be affected by it regardless of which route shape an
// old URL happens to collide with.
//
// Reuses the exact Redis instance app/lib/rateLimit.ts already uses (same
// KV_REST_API_URL/TOKEN env vars, same Upstash REST client — no new
// external service to provision). MongoDB's RedirectMapping collection
// stays the source of truth for full CRUD/audit; Redis is purely a fast,
// write-through cache of the "approved" subset, keyed by old path.
const REDIRECT_KEY_PREFIX = 'redirect-map:';

const redis =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
    : null;

export function isRedirectCacheConfigured(): boolean {
  return !!redis;
}

// Called by middleware.ts on every public request. Never throws — a Redis
// hiccup must never block or break an ordinary page request; treated
// identically to "no mapping found" on any error.
export async function getCachedRedirect(oldUrl: string): Promise<string | null> {
  if (!redis) return null;
  try {
    const value = await redis.get<string>(REDIRECT_KEY_PREFIX + oldUrl);
    return value || null;
  } catch {
    return null;
  }
}

// Called by the admin approve/reject routes to keep Redis in sync with
// Mongo the moment a mapping's status changes — approving without Redis
// configured still works (Mongo remains correct), it just means the
// single-segment-URL case stays unfixed until Redis is configured; every
// multi-segment case still works via the existing not-found.tsx path
// regardless.
export async function setCachedRedirect(oldUrl: string, newUrl: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(REDIRECT_KEY_PREFIX + oldUrl, newUrl);
  } catch {
    // Non-fatal — Mongo is still correct; the not-found.tsx fallback path
    // still serves multi-segment old URLs even if this write failed.
  }
}

export async function deleteCachedRedirect(oldUrl: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(REDIRECT_KEY_PREFIX + oldUrl);
  } catch {
    // Non-fatal, same reasoning as setCachedRedirect.
  }
}
