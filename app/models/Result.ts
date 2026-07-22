import mongoose, { Schema, Document } from 'mongoose';
import { syncKnowledgeChunk } from '@/app/lib/rag/KnowledgeBase';

const VALID_BRANCHES = ['all', 'chennai', 'bangalore', 'coimbatore', 'kochi'];

export interface IResult extends Document {
  title: string;
  slug: string;
  description: string;
  category: string;
  // Single representative pair — kept as-is (existing shape) since the
  // homepage carousel and /results listing cards only ever need one image
  // each; multi-image galleries below are additive, not a replacement.
  before: { url: string; publicId: string };
  after: { url: string; publicId: string };
  beforeImages: Array<{ url: string; publicId: string }>;
  afterImages: Array<{ url: string; publicId: string }>;
  gallery: Array<{ url: string; publicId: string }>;
  video?: { url: string; publicId: string };
  service?: mongoose.Types.ObjectId;
  doctor?: mongoose.Types.ObjectId;
  branch?: string;
  sessions?: string;
  duration?: string;
  patientAge?: string;
  featured: boolean;
  status: 'draft' | 'published';
  // Derived from `status` on every save so every existing query filtering
  // on `active: true` (the /results listing, the homepage carousel) keeps
  // working unmodified — status is the new source of truth, active is a
  // read-only mirror of it.
  active: boolean;
  order: number;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResultSchema = new Schema<IResult>({
  title:       { type: String, required: [true, 'Title is required'], trim: true },
  slug:        { type: String, lowercase: true, match: /^[a-z0-9-]+$/, index: true, unique: true, sparse: true },
  description: { type: String, default: '' },
  category:    { type: String, default: '' },
  before:      { url: { type: String, default: '' }, publicId: { type: String, default: '' } },
  after:       { url: { type: String, default: '' }, publicId: { type: String, default: '' } },
  beforeImages: { type: [{ url: String, publicId: String }], default: [] },
  afterImages:  { type: [{ url: String, publicId: String }], default: [] },
  gallery:      { type: [{ url: String, publicId: String }], default: [] },
  video:        { url: { type: String, default: '' }, publicId: { type: String, default: '' } },
  service:      { type: Schema.Types.ObjectId, ref: 'Service' },
  doctor:       { type: Schema.Types.ObjectId, ref: 'Doctor' },
  branch:       { type: String, enum: VALID_BRANCHES },
  sessions:     { type: String, default: '' },
  duration:     { type: String, default: '' },
  patientAge:   { type: String, default: '' },
  featured:     { type: Boolean, default: false },
  status:       { type: String, enum: ['draft', 'published'], default: 'published' },
  active:       { type: Boolean, default: true },
  order:        { type: Number, default: 0 },
  seoTitle:       { type: String, default: '' },
  seoDescription: { type: String, default: '' },
}, { timestamps: true });

ResultSchema.index({ active: 1, order: 1 });
ResultSchema.index({ service: 1 });
ResultSchema.index({ doctor: 1 });
ResultSchema.index({ branch: 1 });

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Mongoose 6+: async hooks resolve via the returned Promise — do NOT call next().
ResultSchema.pre('save', async function () {
  if (!this.slug && this.title) {
    const base = slugify(this.title);
    let slug = base;
    let counter = 1;
    while (await mongoose.model('Result').exists({ slug, _id: { $ne: this._id } })) {
      slug = `${base}-${counter}`;
      counter++;
    }
    this.slug = slug;
  }
  this.active = this.status === 'published';
});

// The admin edit route updates via findByIdAndUpdate, which bypasses the
// 'save' hook above — keep `active` in sync with `status` there too, or
// draft/publish has no effect on the listing/homepage queries that filter
// on `active` directly.
ResultSchema.pre('findOneAndUpdate', function () {
  const update: any = this.getUpdate();
  if (!update) return;
  const target = update.$set ?? update;
  if (target && typeof target === 'object' && target.status) {
    target.active = target.status === 'published';
  }
});

ResultSchema.post('save', function (doc) {
  syncKnowledgeChunk('result', doc).catch((e) => console.error('[KB] result sync failed', e));
});
ResultSchema.post('findOneAndUpdate', function (doc) {
  if (doc) syncKnowledgeChunk('result', doc).catch((e) => console.error('[KB] result sync failed', e));
});

export const Result = mongoose.models.Result || mongoose.model<IResult>('Result', ResultSchema);
