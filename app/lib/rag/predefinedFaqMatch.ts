export interface FaqLike {
  question: string;
  answer: string;
  category?: string;
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'do', 'does', 'did', 'i', 'you', 'it', 'this',
  'that', 'of', 'for', 'to', 'in', 'on', 'and', 'or', 'my', 'your', 'can',
  'will', 'what', 'how', 'which', 'why', 'me', 'be', 'with',
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

// Small, dependency-free keyword-overlap heuristic — a single best match for
// the FAQ assistant, distinct from FAQPageClient.tsx's live-filter useMemo
// (that does incremental as-you-type filtering across many results; this
// does a one-shot best-match lookup for a single submitted question).
export function findBestPredefinedMatch<T extends FaqLike>(question: string, allFaqs: T[]): T | null {
  const qTokens = tokenize(question);
  if (qTokens.size === 0) return null;

  let best: T | null = null;
  let bestScore = 0;

  for (const faq of allFaqs) {
    const faqTokens = tokenize(faq.question);
    if (faqTokens.size === 0) continue;
    const overlap = Array.from(qTokens).filter((t) => faqTokens.has(t)).length;
    // Overlap relative to the smaller token set so short questions aren't
    // unfairly penalized against longer FAQ questions.
    const score = overlap / Math.min(qTokens.size, faqTokens.size);
    if (score > bestScore) {
      bestScore = score;
      best = faq;
    }
  }

  // Require most of the significant words to match — a loose partial overlap
  // shouldn't short-circuit straight to a predefined answer when the
  // question's real intent likely differs.
  const MIN_SCORE = 0.6;
  return bestScore >= MIN_SCORE ? best : null;
}
