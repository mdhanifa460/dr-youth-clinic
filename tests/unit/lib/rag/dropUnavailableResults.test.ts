import { describe, it, expect, vi, beforeEach } from 'vitest';

const LIVE = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const GONE = 'bbbbbbbbbbbbbbbbbbbbbbbb';
let switchOn = true;
let lastQuery: any = null;

vi.mock('@/app/lib/mongodb', () => ({ connectDB: async () => {} }));
vi.mock('@/app/lib/siteConfig', () => ({ getSiteConfig: async () => ({ showBeforeAfterOnPublic: switchOn }) }));
vi.mock('@/app/models/Result', () => ({
  PUBLISHED_RESULT: { $or: [{ status: 'published' }] },
  Result: {
    find: (q: any) => {
      lastQuery = q;
      return { select: () => ({ lean: async () => [{ _id: LIVE }] }) };
    },
  },
}));
vi.mock('@/app/lib/rag/EmbeddingService', () => ({ embedQuery: async () => [] }));
vi.mock('@/app/lib/rag/VectorSearchService', () => ({ vectorSearchKnowledgeBase: async () => [] }));

import { dropUnavailableResults } from '@/app/lib/rag/RecommendationService';

const cards = [
  { type: 'service', sourceId: 's1' },
  { type: 'result', sourceId: LIVE },
  { type: 'result', sourceId: GONE },
];

describe('dropUnavailableResults', () => {
  beforeEach(() => { switchOn = true; lastQuery = null; });

  it('keeps only Results that are published now; other cards pass through', async () => {
    const out = await dropUnavailableResults(cards);
    expect(out.map((c) => c.sourceId)).toEqual(['s1', LIVE]);
    expect(lastQuery.$or).toBeDefined();
  });

  it('drops every Result card while Before / After is switched off', async () => {
    switchOn = false;
    const out = await dropUnavailableResults(cards);
    expect(out.map((c) => c.sourceId)).toEqual(['s1']);
  });

  it('does nothing (no lookup) when there are no Result cards', async () => {
    const out = await dropUnavailableResults([{ type: 'doctor', sourceId: 'd1' }]);
    expect(out).toHaveLength(1);
    expect(lastQuery).toBeNull();
  });
});
