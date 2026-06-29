import mongoose, { Schema, Document } from 'mongoose';

export interface IPageSeo extends Document {
  pageKey: string;
  pageLabel: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  canonicalUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PageSeoSchema = new Schema<IPageSeo>(
  {
    pageKey: { type: String, required: true, unique: true, trim: true },
    pageLabel: { type: String, required: true },
    metaTitle: { type: String, maxlength: [60, 'Meta title should be max 60 characters'] },
    metaDescription: { type: String, maxlength: [160, 'Meta description should be max 160 characters'] },
    keywords: [String],
    canonicalUrl: String,
  },
  { timestamps: true }
);

export const PageSeo =
  mongoose.models.PageSeo ||
  mongoose.model<IPageSeo>('PageSeo', PageSeoSchema);
