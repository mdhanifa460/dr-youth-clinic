import { Redis } from '@upstash/redis';
import crypto from 'crypto';

// Response cache for the AI abstraction layer — avoids paying for a fresh
// generation when the exact same input was already generated recently.
// Reuses the same Upstash Redis config as app/lib/rateLimit.ts (Vercel's
// Upstash Marketplace integration sets KV_REST_API_URL/TOKEN — this project
// is already on that), just a different key namespace ("aicache:"). Falls
// back to an in-memory Map when Redis isn't configured (local dev) or on a
// Redis hiccup, same reasoning as rateLimit.ts: a cache that's briefly
// per-instance instead of distributed is still worth having, and a cache
// failure must never be the reason an AI call breaks.
interface CacheEntry { value: string; expiresAt: number }
const memoryCache = new Map<string, CacheEntry>();

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    memoryCache.forEach((entry, key) => {
      if (now > entry.expiresAt) memoryCache.delete(key);
    });
  }, 5 * 60 * 1000);
}

const redis =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? new Redis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
        // Every value passing through this cache is already a plain string
        // (an AI response). Upstash's client defaults to auto-JSON-parsing
        // anything that looks like JSON on read (and implicitly encoding on
        // write) — harmless for prose, but it silently hands back a parsed
        // object instead of a string for any cached value that happens to
        // itself be JSON text (e.g. a jsonMode:true Gemini response), which
        // breaks the string-in/string-out contract getCached/setCached
        // promise their callers. Disabling it makes this cache always
        // round-trip the exact bytes it was given.
        automaticDeserialization: false,
      })
    : null;

// namespace labels which feature/route the entry belongs to (for easy
// debugging/manual cache flushing later); parts is hashed so arbitrary
// prompt length/content never blows past Redis key-size limits and prompt
// text never ends up sitting in a key name.
export function buildCacheKey(namespace: string, parts: unknown): string {
  const hash = crypto.createHash('sha256').update(JSON.stringify(parts)).digest('hex');
  return `aicache:${namespace}:${hash}`;
}

export async function getCached(key: string): Promise<string | null> {
  if (redis) {
    try {
      const value = await redis.get<string>(key);
      return value ?? null;
    } catch (e) {
      console.error('[aiCache] Redis get failed, falling back to in-memory', e);
    }
  }
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

export async function setCached(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (redis) {
    try {
      await redis.set(key, value, { ex: ttlSeconds });
      return;
    } catch (e) {
      console.error('[aiCache] Redis set failed, falling back to in-memory', e);
    }
  }
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}
