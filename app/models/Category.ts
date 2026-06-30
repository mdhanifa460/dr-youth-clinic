import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  label: string;
  slug: string;
  dbKey: string;
  icon: string;
  description: string;
  heroGrad: string;
  accentColor: string;
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    label: { type: String, required: [true, 'Label is required'], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    dbKey: { type: String, required: true, trim: true },
    icon: { type: String, default: '✨' },
    description: { type: String, maxlength: 300 },
    heroGrad: { type: String, default: 'from-[#0B2560] via-[#1e3a8a] to-[#3b82f6]' },
    accentColor: { type: String, default: '#3b82f6' },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

// Seed defaults — call once on first load
export const DEFAULT_CATEGORIES = [
  {
    label: 'Skin & Aesthetics', slug: 'skin', dbKey: 'Skin', icon: '✨',
    description: 'Evidence-based dermatological treatments for every skin concern — acne, pigmentation, anti-ageing.',
    heroGrad: 'from-[#7c1d0a] via-[#a63c1c] to-[#c96a4e]', accentColor: '#c96a4e', order: 1,
  },
  {
    label: 'Hair Restoration', slug: 'hair', dbKey: 'Hair', icon: '🌿',
    description: 'Comprehensive hair and scalp solutions — PRP, GFC, transplants, and medical-grade treatments.',
    heroGrad: 'from-[#6b2d00] via-[#9a4109] to-[#d97706]', accentColor: '#d97706', order: 2,
  },
  {
    label: 'Laser Precision', slug: 'laser', dbKey: 'Laser', icon: '⚡',
    description: 'FDA-approved laser technology for permanent hair reduction, pigmentation, and skin rejuvenation.',
    heroGrad: 'from-[#0B2560] via-[#1e3a8a] to-[#3b82f6]', accentColor: '#3b82f6', order: 3,
  },
  {
    label: 'Specialist Care', slug: 'other', dbKey: 'Other', icon: '🏥',
    description: 'Specialised aesthetic and medical wellness procedures crafted for unique concerns.',
    heroGrad: 'from-[#052e16] via-[#064e3b] to-[#059669]', accentColor: '#059669', order: 4,
  },
];
