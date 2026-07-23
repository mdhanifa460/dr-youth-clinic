import mongoose, { Schema, Document } from 'mongoose';
import { syncKnowledgeChunk } from '@/app/lib/rag/KnowledgeBase';
import { removeChunk } from '@/app/lib/rag/KnowledgeBase';

export interface IKnowledgeDocument extends Document {
  title: string;
  body: string;
  docType: 'policy' | 'treatment_guide' | 'research' | 'admin_note';
  tags: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeDocumentSchema = new Schema<IKnowledgeDocument>({
  title:   { type: String, required: [true, 'Title is required'], trim: true },
  body:    { type: String, required: [true, 'Body is required'] },
  docType: { type: String, enum: ['policy', 'treatment_guide', 'research', 'admin_note'], required: true, default: 'admin_note' },
  tags:    { type: [String], default: [] },
  active:  { type: Boolean, default: true },
}, { timestamps: true });

KnowledgeDocumentSchema.index({ docType: 1, active: 1 });

// Only active documents feed the knowledge base — an inactive/deleted
// document must have its chunk removed too, or the chatbot keeps citing
// content an admin explicitly turned off.
KnowledgeDocumentSchema.post('save', function (doc: any) {
  if (doc.active) {
    syncKnowledgeChunk('document', doc).catch((e) => console.error('[KB] document sync failed', e));
  } else {
    removeChunk('document', String(doc._id)).catch((e) => console.error('[KB] document remove failed', e));
  }
});
KnowledgeDocumentSchema.post('findOneAndUpdate', function (doc: any) {
  if (!doc) return;
  if (doc.active) {
    syncKnowledgeChunk('document', doc).catch((e) => console.error('[KB] document sync failed', e));
  } else {
    removeChunk('document', String(doc._id)).catch((e) => console.error('[KB] document remove failed', e));
  }
});
KnowledgeDocumentSchema.post('findOneAndDelete', function (doc: any) {
  if (doc) removeChunk('document', String(doc._id)).catch((e) => console.error('[KB] document remove failed', e));
});

export const KnowledgeDocument = mongoose.models.KnowledgeDocument || mongoose.model<IKnowledgeDocument>('KnowledgeDocument', KnowledgeDocumentSchema);
