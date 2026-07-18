import { callGeminiText } from '@/app/lib/ai/gemini';
import { embedQuery } from './EmbeddingService';
import { vectorSearchKnowledgeBase } from './VectorSearchService';
import { findBestPredefinedMatch, FaqLike } from './predefinedFaqMatch';

// Calibrated live against the real KB and gemini-embedding-001: unrelated
// queries ("what is the capital of France") scored 0.77-0.80 against real
// clinic FAQ chunks, while genuinely relevant queries scored 0.85-0.88 — 0.7
// let everything through. 0.82 sits in the gap with margin on both sides.
const MIN_RELEVANCE_SCORE = 0.82;

export type RagAnswer =
  | { type: 'predefined'; answer: string; matchedQuestion: string }
  | { type: 'ai-grounded'; answer: string; sources: { title: string; url?: string }[] }
  | { type: 'no-answer' };

// Predefined lookup first (no AI call at all) -> Atlas Vector Search fallback
// -> Gemini generation grounded ONLY in the retrieved knowledge-base context.
export async function answerFaqQuestion(question: string, allFaqs: FaqLike[]): Promise<RagAnswer> {
  const predefined = findBestPredefinedMatch(question, allFaqs);
  if (predefined) {
    return { type: 'predefined', answer: predefined.answer, matchedQuestion: predefined.question };
  }

  const queryEmbedding = await embedQuery(question);
  const hits = await vectorSearchKnowledgeBase(queryEmbedding, { limit: 5 });

  if (hits.length === 0 || hits[0].score < MIN_RELEVANCE_SCORE) {
    return { type: 'no-answer' };
  }

  const context = hits
    .map((h) => `[${h.sourceType}] ${h.title}\n${h.text}`)
    .join('\n\n---\n\n');

  const answer = await callGeminiText(question, {
    system:
      "You are DR Youth Clinic's assistant. Answer ONLY using the context below. " +
      "If the context doesn't cover the question, say you don't have that information " +
      "and suggest booking a consultation. Keep the answer concise and factual — do not " +
      "invent prices, medical claims, or availability not present in the context.\n\n" +
      `Context:\n${context}`,
    maxTokens: 500,
  });

  return {
    type: 'ai-grounded',
    answer,
    sources: hits.map((h) => ({ title: h.title, url: h.url })),
  };
}
