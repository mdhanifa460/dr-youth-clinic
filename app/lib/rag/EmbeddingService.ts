import { embedGeminiText } from '@/app/lib/ai/gemini';

// Document text (services, doctors, blogs, locations, FAQs) is embedded with
// RETRIEVAL_DOCUMENT; a patient's live question is embedded with
// RETRIEVAL_QUERY — Gemini's embedding model produces better-aligned vectors
// for asymmetric search (short query vs. long document) when each side uses
// its matching task type.
export async function embedText(text: string): Promise<number[]> {
  return embedGeminiText(text, 'RETRIEVAL_DOCUMENT');
}

export async function embedQuery(question: string): Promise<number[]> {
  return embedGeminiText(question, 'RETRIEVAL_QUERY');
}
