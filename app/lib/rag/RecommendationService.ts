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

const MIN_SCORE = 0.7;

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

  return hits
    .filter((h: any) => (h.score ?? 0) >= MIN_SCORE)
    .map((h: any) => ({
      type: h.sourceType,
      sourceId: h.sourceId,
      title: h.title,
      subtitle: h.category || h.location || '',
      href: h.url,
      score: h.score,
    }));
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
