import { embedGeminiText } from '@/app/lib/ai/gemini';

// Document text (services, doctors, blogs, locations, FAQs) is embedded with
// RETRIEVAL_DOCUMENT; a patient's live question is embedded with
// RETRIEVAL_QUERY — Gemini's embedding model produces better-aligned vectors
// for asymmetric search (short query vs. long document) when each side uses
// its matching task type.
export async function embedText(text: string): Promise<number[]> {
  return embedGeminiText(text, 'RETRIEVAL_DOCUMENT');
}

// Common questions ("do you have offers?", suggested-question chip taps)
// repeat across many different patients/sessions — caching by normalized
// text avoids re-paying the Gemini embedding call for an identical question
// asked again within the window. In-memory only (per serverless instance,
// like app/lib/rateLimit.ts's store) — on a cache miss it just falls through
// to the real call, so a cold/different instance never produces wrong
// behavior, only a missed optimization.
interface CacheEntry { embedding: number[]; expiresAt: number }
const QUERY_CACHE_TTL_MS = 10 * 60 * 1000;
const QUERY_CACHE_MAX_SIZE = 500;
const queryCache = new Map<string, CacheEntry>();

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    queryCache.forEach((entry, key) => {
      if (now > entry.expiresAt) queryCache.delete(key);
    });
  }, 5 * 60 * 1000);
}

function normalizeQuery(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function embedQuery(question: string): Promise<number[]> {
  const key = normalizeQuery(question);
  const cached = queryCache.get(key);
  if (cached && Date.now() <= cached.expiresAt) return cached.embedding;

  const embedding = await embedGeminiText(question, 'RETRIEVAL_QUERY');

  if (queryCache.size >= QUERY_CACHE_MAX_SIZE) {
    const oldestKey = queryCache.keys().next().value;
    if (oldestKey !== undefined) queryCache.delete(oldestKey);
  }
  queryCache.set(key, { embedding, expiresAt: Date.now() + QUERY_CACHE_TTL_MS });

  return embedding;
}
