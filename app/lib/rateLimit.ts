import { Redis } from '@upstash/redis';

// In-memory fallback — the original implementation. Correct for a single
// long-lived process (like `next dev`), but on Vercel each serverless
// invocation can land on a different, possibly-cold instance, so this
// Map is really "rate limit per instance," not per deployment — a
// determined caller (or just normal traffic spread across instances)
// can exceed the intended limit by a wide margin. Kept as the fallback
// so rate limiting still does *something* — just not a distributed
// guarantee — when Redis isn't configured (e.g. local dev).
interface Entry { count: number; resetAt: number }
const memoryStore = new Map<string, Entry>();

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    memoryStore.forEach((entry, key) => {
      if (now > entry.resetAt) memoryStore.delete(key);
    });
  }, 5 * 60 * 1000);
}

function checkRateLimitInMemory(key: string, limit: number, windowMs: number): { allowed: boolean; resetAt: number } {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, resetAt: entry.resetAt };
}

// Upstash's REST client — plain HTTPS, no persistent TCP connection to
// manage, which is why it's the standard choice for serverless. Only
// constructed when both env vars are present; every call site falls back
// to the in-memory limiter otherwise, so this is safe to deploy with or
// without a Redis instance actually provisioned. KV_REST_API_URL/TOKEN
// (not the raw UPSTASH_REDIS_REST_* names) are what Vercel's own
// Marketplace → "Upstash for Redis" integration actually sets — this
// project is on that, free plan, auto-upgrade disabled.
const redis =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
    : null;

async function checkRateLimitDistributed(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; resetAt: number }> {
  const redisKey = `ratelimit:${key}`;
  // INCR + a TTL set only on the first increment of the window is the
  // standard fixed-window counter pattern — one round trip for the common
  // (already-within-limit) case, a second only when the key is brand new.
  const count = await redis!.incr(redisKey);
  if (count === 1) {
    await redis!.expire(redisKey, Math.ceil(windowMs / 1000));
  }
  const ttl = await redis!.ttl(redisKey);
  const resetAt = Date.now() + Math.max(ttl, 0) * 1000;

  return { allowed: count <= limit, resetAt };
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; resetAt: number }> {
  if (!redis) return checkRateLimitInMemory(key, limit, windowMs);

  try {
    return await checkRateLimitDistributed(key, limit, windowMs);
  } catch (e) {
    // A Redis hiccup must never be the reason a real request gets
    // rejected (or, worse, an abusive one gets waved through with no
    // limit at all) — fall back to the in-memory check for this call.
    console.error('[rateLimit] Redis check failed, falling back to in-memory', e);
    return checkRateLimitInMemory(key, limit, windowMs);
  }
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function tooManyRequestsResponse(resetAt: number) {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ success: false, message: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  );
}
