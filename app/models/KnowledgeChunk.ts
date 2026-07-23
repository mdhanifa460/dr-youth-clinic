import mongoose, { Schema, Document } from 'mongoose';

// A derived, non-authoritative search/embedding index — never a source of
// truth. Service/Doctor/Blog/LocationContent/FAQ content keeps being authored
// exactly as today through their existing admin screens; this collection is
// kept in sync as a side effect of those saves (see the sync hooks added to
// each model) so Atlas Vector Search has one flat collection to query instead
// of a 5-way fan-out across differently-shaped collections.
export interface IKnowledgeChunk extends Document {
  sourceType: 'service' | 'doctor' | 'blog' | 'location' | 'faq' | 'result' | 'offer' | 'document' | 'story';
  sourceId: string;
  title: string;
  text: string;
  category?: string;
  location?: string;
  url?: string;
  embedding?: number[];
  embeddingModel?: string;
  embeddingUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeChunkSchema = new Schema<IKnowledgeChunk>(
  {
    sourceType: {
      type: String,
      required: true,
      enum: ['service', 'doctor', 'blog', 'location', 'faq', 'result', 'offer', 'document', 'story'],
    },
    sourceId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    category: {
      type: String,
    },
    location: {
      type: String,
    },
    url: {
      type: String,
    },
    embedding: {
      type: [Number],
      default: undefined,
    },
    embeddingModel: {
      type: String,
    },
    embeddingUpdatedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Idempotent sync target — every upsertChunk() call is keyed on this, so
// re-running a reindex (or a hook firing twice) never duplicates a chunk.
KnowledgeChunkSchema.index({ sourceType: 1, sourceId: 1 }, { unique: true });

export const KnowledgeChunk =
  mongoose.models.KnowledgeChunk ||
  mongoose.model<IKnowledgeChunk>('KnowledgeChunk', KnowledgeChunkSchema);
