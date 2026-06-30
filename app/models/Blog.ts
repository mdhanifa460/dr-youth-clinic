import mongoose, { Schema, Document } from 'mongoose';

export interface IBlog extends Document {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImage: { url: string; publicId: string };
  category: string;
  tags: string[];
  author: string;
  authorTitle: string;
  readTime: string;
  publishedAt: Date;
  featured: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema = new Schema<IBlog>({
  title:       { type: String, required: [true, 'Title is required'], trim: true },
  slug:        { type: String, required: [true, 'Slug is required'], unique: true, trim: true, lowercase: true },
  excerpt:     { type: String, maxlength: 300 },
  body:        { type: String, default: '' },
  coverImage:  { url: { type: String, default: '' }, publicId: { type: String, default: '' } },
  category:    { type: String, enum: ['Hair Care', 'Skin Care', 'Laser', 'Aesthetics', 'General'], default: 'General' },
  tags:        [String],
  author:      { type: String, default: 'DR Youth Clinic Team' },
  authorTitle: { type: String, default: 'Medical Content Team' },
  readTime:    { type: String, default: '5 min read' },
  publishedAt: { type: Date, default: Date.now },
  featured:    { type: Boolean, default: false },
  active:      { type: Boolean, default: true },
}, { timestamps: true });

BlogSchema.index({ slug: 1 }, { unique: true });
BlogSchema.index({ active: 1, publishedAt: -1 });

export const Blog = mongoose.models.Blog || mongoose.model<IBlog>('Blog', BlogSchema);
