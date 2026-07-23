import mongoose, { Schema, Document } from 'mongoose';
import { syncKnowledgeChunk, removeChunk } from '@/app/lib/rag/KnowledgeBase';

export interface IFaq extends Document {
  question: string;
  answer: string;
  category: string;
  tags: string[];
  doctor?: mongoose.Types.ObjectId;
  service?: mongoose.Types.ObjectId;
  location?: string;
  featured: boolean;
  order: number;
  active: boolean;
  seoTitle: string;
  seoDescription: string;
  createdAt: Date;
  updatedAt: Date;
}

const FaqSchema = new Schema<IFaq>({
  question: { type: String, required: [true, 'Question is required'], trim: true },
  answer:   { type: String, required: [true, 'Answer is required'] },
  category: { type: String, default: '' },
  tags:     { type: [String], default: [] },
  doctor:   { type: Schema.Types.ObjectId, ref: 'Doctor' },
  service:  { type: Schema.Types.ObjectId, ref: 'Service' },
  location: { type: String, default: '' },
  featured: { type: Boolean, default: false },
  order:    { type: Number, default: 0 },
  active:   { type: Boolean, default: true },
  seoTitle:       { type: String, default: '' },
  seoDescription: { type: String, default: '' },
}, { timestamps: true });

FaqSchema.index({ active: 1, order: 1 });
FaqSchema.index({ category: 1 });

// This is an ADDITIVE reusable FAQ system — Service.faq[] and Video.faq[]
// (inline Q&A embedded directly in those documents) are untouched by this
// model and keep rendering exactly as they do today. This collection is for
// FAQs an admin wants to reuse across multiple surfaces (Web Stories, the
// AI assistant, future Doctor/Location pages) via the doctor/service/
// location/tag links above, not a forced migration of existing content.
FaqSchema.post('save', function (doc: any) {
  if (doc.active) {
    syncKnowledgeChunk('faq', { _id: doc._id, question: doc.question, answer: doc.answer, category: doc.category })
      .catch((e) => console.error('[KB] faq sync failed', e));
  } else {
    removeChunk('faq', String(doc._id)).catch((e) => console.error('[KB] faq remove failed', e));
  }
});
FaqSchema.post('findOneAndUpdate', function (doc: any) {
  if (!doc) return;
  if (doc.active) {
    syncKnowledgeChunk('faq', { _id: doc._id, question: doc.question, answer: doc.answer, category: doc.category })
      .catch((e) => console.error('[KB] faq sync failed', e));
  } else {
    removeChunk('faq', String(doc._id)).catch((e) => console.error('[KB] faq remove failed', e));
  }
});
FaqSchema.post('findOneAndDelete', function (doc: any) {
  if (doc) removeChunk('faq', String(doc._id)).catch((e) => console.error('[KB] faq remove failed', e));
});

export const Faq = mongoose.models.Faq || mongoose.model<IFaq>('Faq', FaqSchema);
