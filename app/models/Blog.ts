import mongoose, { Schema, Document } from 'mongoose';
import { syncKnowledgeChunk } from '@/app/lib/rag/KnowledgeBase';

export interface IBlog extends Document {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  // Structured Content Block Builder version of `body` — additive; when
  // present, the public page renders this instead of parsing `body` as
  // Markdown. `body` stays as the fallback for posts not yet converted.
  bodyBlocks?: Array<{ id: string; type: string; visible: boolean; data: Record<string, any> }>;
  coverImage: { url: string; publicId: string };
  category: string;
  tags: string[];
  author: string;
  authorTitle: string;
  readTime: string;
  publishedAt: Date;
  featured: boolean;
  active: boolean;
  // SEO overrides — generateMetadata falls back to title/excerpt when unset.
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogImage?: { url: string; publicId: string };
  keywords?: string[];
  // Trust section — the doctor who reviewed this article, and any medical
  // sources it cites. Also powers the "Doctor-recommended reads" listing
  // section and the Article Intelligence checklist.
  reviewedByDoctorId?: mongoose.Types.ObjectId;
  medicalReferences?: Array<{ label: string; url: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const ContentBlockSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    visible: { type: Boolean, default: true },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const BlogSchema = new Schema<IBlog>({
  title:       { type: String, required: [true, 'Title is required'], trim: true },
  slug:        { type: String, required: [true, 'Slug is required'], trim: true, lowercase: true },
  excerpt:     { type: String, maxlength: 300 },
  body:        { type: String, default: '' },
  bodyBlocks:  { type: [ContentBlockSchema], default: undefined },
  coverImage:  { url: { type: String, default: '' }, publicId: { type: String, default: '' } },
  category:    { type: String, enum: ['Hair Care', 'Skin Care', 'Laser', 'Aesthetics', 'General'], default: 'General' },
  tags:        [String],
  author:      { type: String, default: 'DR Youth Clinic Team' },
  authorTitle: { type: String, default: 'Medical Content Team' },
  readTime:    { type: String, default: '5 min read' },
  publishedAt: { type: Date, default: Date.now },
  featured:    { type: Boolean, default: false },
  active:      { type: Boolean, default: true },
  metaTitle:        { type: String, maxlength: 60 },
  metaDescription:  { type: String, maxlength: 160 },
  canonicalUrl:     { type: String, trim: true },
  ogImage:          { url: { type: String, default: '' }, publicId: { type: String, default: '' } },
  keywords:         [String],
  reviewedByDoctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
  medicalReferences:  [{ label: { type: String, required: true }, url: { type: String, required: true }, _id: false }],
}, { timestamps: true });

BlogSchema.index({ slug: 1 }, { unique: true });
BlogSchema.index({ active: 1, publishedAt: -1 });

// Keeps the RAG knowledge base (KnowledgeChunk) in sync whenever a blog post
// is created or edited — fire-and-forget + logged, never allowed to fail the
// actual save.
BlogSchema.post('save', function (doc) {
  syncKnowledgeChunk('blog', doc).catch((e) => console.error('[KB] blog sync failed', e));
});
BlogSchema.post('findOneAndUpdate', function (doc) {
  if (doc) syncKnowledgeChunk('blog', doc).catch((e) => console.error('[KB] blog sync failed', e));
});

export const Blog = mongoose.models.Blog || mongoose.model<IBlog>('Blog', BlogSchema);
