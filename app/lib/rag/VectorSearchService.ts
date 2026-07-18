import { connectDB } from '@/app/lib/mongodb';
import { KnowledgeChunk, IKnowledgeChunk } from '@/app/models/KnowledgeChunk';

export interface VectorSearchOpts {
  limit?: number;
  sourceTypes?: IKnowledgeChunk['sourceType'][];
  location?: string;
}

// $vectorSearch against the RAG knowledge base — one flat collection
// (see the design-tension note in app/models/KnowledgeChunk.ts) instead of a
// 5-way fan-out across Service/Doctor/Blog/LocationContent/FAQ.
export async function vectorSearchKnowledgeBase(
  queryEmbedding: number[],
  opts: VectorSearchOpts = {}
) {
  await connectDB();
  const limit = opts.limit ?? 5;

  const filter: Record<string, unknown> = {};
  if (opts.sourceTypes?.length) filter.sourceType = { $in: opts.sourceTypes };
  if (opts.location) filter.location = opts.location;

  return KnowledgeChunk.aggregate([
    {
      $vectorSearch: {
        index: 'kb_vector_idx',
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: Math.max(150, limit * 20),
        limit,
        ...(Object.keys(filter).length ? { filter } : {}),
      },
    },
    {
      $project: {
        sourceType: 1,
        sourceId: 1,
        title: 1,
        text: 1,
        category: 1,
        location: 1,
        url: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ]);
}
