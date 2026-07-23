import mongoose, { Schema, Document } from 'mongoose';
import { syncKnowledgeChunk } from '@/app/lib/rag/KnowledgeBase';

export interface IOffer extends Document {
  title: string;
  description: string;
  category: string;
  originalPrice: number;
  discountedPrice: number;
  badge: string;
  features: string[];
  image: { url: string; publicId: string };
  validUntil: Date | null;
  terms: string;
  featured: boolean;
  active: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const OfferSchema = new Schema<IOffer>({
  title:           { type: String, required: [true, 'Title is required'], trim: true },
  description:     { type: String, default: '' },
  category:        { type: String, enum: ['Skin Care', 'Hair Care', 'Laser', 'Body', 'Package'], default: 'Package' },
  originalPrice:   { type: Number, required: [true, 'Original price is required'], min: 0 },
  discountedPrice: { type: Number, required: [true, 'Discounted price is required'], min: 0 },
  badge:           { type: String, default: '' },
  features:        [{ type: String }],
  image:           { url: { type: String, default: '' }, publicId: { type: String, default: '' } },
  validUntil:      { type: Date, default: null },
  terms:           { type: String, default: '' },
  featured:        { type: Boolean, default: false },
  active:          { type: Boolean, default: true },
  order:           { type: Number, default: 0 },
}, { timestamps: true });

OfferSchema.index({ active: 1, order: 1 });

OfferSchema.post('save', function (doc) {
  syncKnowledgeChunk('offer', doc).catch((e) => console.error('[KB] offer sync failed', e));
});
OfferSchema.post('findOneAndUpdate', function (doc) {
  if (doc) syncKnowledgeChunk('offer', doc).catch((e) => console.error('[KB] offer sync failed', e));
});

export const Offer = mongoose.models.Offer || mongoose.model<IOffer>('Offer', OfferSchema);
