import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  label: string;
  slug: string;
  dbKey: string;
  icon: string;
  tagline: string;
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
    // Short two/three-word line shown under the label on the Services Hub
    // card (e.g. "Radiance · Restored") — distinct from `description`,
    // which is longer body copy.
    tagline: { type: String, default: '', trim: true },
    description: { type: String, maxlength: 300 },
    heroGrad: { type: String, default: 'from-[#0B2560] via-[#1e3a8a] to-[#3b82f6]' },
    // Every other per-category visual accent on the Services Hub page
    // (border, pill background, headings, dot, arrow) is derived from this
    // single color at render time via CSS color-mix() rather than storing
    // 6+ separate hardcoded Tailwind classes per category here.
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
    label: 'Skin & Aesthetics', slug: 'skin', dbKey: 'Skin', icon: '✨', tagline: 'Radiance · Restored',
    description: 'Advanced dermatological solutions for luminous, healthy skin — from acne to anti-ageing.',
    heroGrad: 'from-[#7c1d0a] via-[#a63c1c] to-[#c96a4e]', accentColor: '#c96a4e', order: 1,
  },
  {
    label: 'Hair Restoration', slug: 'hair', dbKey: 'Hair', icon: '🌿', tagline: 'Volume · Confidence',
    description: 'Expert trichology for PRP, GFC, transplants, and scalp-level treatments.',
    heroGrad: 'from-[#6b2d00] via-[#9a4109] to-[#d97706]', accentColor: '#d97706', order: 2,
  },
  {
    label: 'Laser Precision', slug: 'laser', dbKey: 'Laser', icon: '⚡', tagline: 'Science · Skin',
    description: 'Cutting-edge laser technology for hair removal, pigmentation, and skin rejuvenation.',
    heroGrad: 'from-[#0B2560] via-[#1e3a8a] to-[#3b82f6]', accentColor: '#3b82f6', order: 3,
  },
  {
    label: 'Specialist Care', slug: 'other', dbKey: 'Other', icon: '🏥', tagline: 'Tailored · Precise',
    description: 'Specialised aesthetic and medical wellness procedures crafted for your unique goals.',
    heroGrad: 'from-[#052e16] via-[#064e3b] to-[#059669]', accentColor: '#059669', order: 4,
  },
];
