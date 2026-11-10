import { embedQuery } from './EmbeddingService';
import { vectorSearchKnowledgeBase } from './VectorSearchService';
import type { IKnowledgeChunk } from '@/app/models/KnowledgeChunk';

export type RecommendationType = 'doctor' | 'service' | 'offer' | 'result' | 'location';

export interface RecommendationCard {
  type: RecommendationType;
  sourceId: string;
  title: string;
  subtitle?: string;
  href?: string;
  score: number;
}

const RECOMMENDABLE_TYPES: RecommendationType[] = ['doctor', 'service', 'offer', 'result', 'location'];

// Single threshold shared by every recommendation surface (this service's
// own callers, and the AI chat route's card-building step) — previously the
// chat route hardcoded its own 0.72 independent of this file's 0.7, so the
// two could silently disagree on what counts as "confident enough to show".
export const RECOMMENDATION_MIN_SCORE = 0.72;

// Pure scoring/shaping step, split out from recommend() so callers that
// already have hits from their own $vectorSearch call (e.g. the AI chat
// route, which reuses one embedding+search for both grounding context and
// recommendation cards) can reuse the exact same threshold/shape logic
// without paying for a second embedding+search call.
export function scoreHitsToCards(
  hits: any[],
  opts: { types?: RecommendationType[]; minScore?: number } = {}
): RecommendationCard[] {
  const allow = opts.types?.length ? new Set(opts.types) : null;
  const minScore = opts.minScore ?? RECOMMENDATION_MIN_SCORE;

  return hits
    .filter((h: any) => (!allow || allow.has(h.sourceType)) && (h.score ?? 0) >= minScore)
    .map((h: any) => ({
      type: h.sourceType,
      sourceId: h.sourceId,
      title: h.title,
      subtitle: h.category || h.location || '',
      href: h.url,
      score: h.score,
    }));
}

// The search index can still hold Results that were since deleted or
// unpublished (they 404). Keep only Result cards that are live now, under
// the same rule the Results pages use, and none at all while Before / After
// is switched off (those pages don't exist then). Other card types pass.
export async function dropUnavailableResults<T extends { type: string; sourceId: string }>(cards: T[]): Promise<T[]> {
  const resultIds = cards.filter((c) => c.type === 'result').map((c) => c.sourceId);
  if (resultIds.length === 0) return cards;
  try {
    const [{ connectDB }, { Result, PUBLISHED_RESULT }, { getSiteConfig }] = await Promise.all([
      import('@/app/lib/mongodb'),
      import('@/app/models/Result'),
      import('@/app/lib/siteConfig'),
    ]);
    if (!(await getSiteConfig()).showBeforeAfterOnPublic) return cards.filter((c) => c.type !== 'result');
    await connectDB();
    const valid = resultIds.filter((id) => /^[a-f0-9]{24}$/i.test(id));
    const live = await (Result as any).find({ _id: { $in: valid }, ...PUBLISHED_RESULT }).select('_id').lean();
    const liveIds = new Set(live.map((r: any) => String(r._id)));
    return cards.filter((c) => c.type !== 'result' || liveIds.has(String(c.sourceId)));
  } catch {
    return cards.filter((c) => c.type !== 'result');
  }
}

// Recommendation engine — deliberately thin. Reuses the exact same
// $vectorSearch index (kb_vector_idx) the FAQ RAG pipeline already queries;
// the only difference is which sourceTypes are allowed through and that the
// output is a card shape instead of grounded prose. Doctor/Service/Offer/
// Result/Branch recommendation are all one function with a different
// `types` filter — "Package" (from the brief) maps to `offer`, since that's
// the existing model for bundled treatment pricing.
export async function recommend(
  query: string,
  opts: { limit?: number; types?: RecommendationType[]; location?: string } = {}
): Promise<RecommendationCard[]> {
  const embedding = await embedQuery(query);
  const sourceTypes = (opts.types?.length ? opts.types : RECOMMENDABLE_TYPES) as IKnowledgeChunk['sourceType'][];
  const hits = await vectorSearchKnowledgeBase(embedding, {
    limit: opts.limit ?? 6,
    sourceTypes,
    location: opts.location,
  });

  return dropUnavailableResults(scoreHitsToCards(hits, { types: opts.types }));
}

export async function recommendDoctors(query: string, location?: string) {
  return recommend(query, { types: ['doctor'], location, limit: 3 });
}
export async function recommendServices(query: string, location?: string) {
  return recommend(query, { types: ['service'], location, limit: 3 });
}
export async function recommendOffers(query: string) {
  return recommend(query, { types: ['offer'], limit: 3 });
}
export async function recommendResults(query: string) {
  return recommend(query, { types: ['result'], limit: 3 });
}
export async function recommendBranch(query: string) {
  return recommend(query, { types: ['location'], limit: 3 });
}
