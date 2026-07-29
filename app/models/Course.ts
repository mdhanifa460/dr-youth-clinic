import mongoose, { Schema, Document } from 'mongoose';

// Deliberately separate from VIDEO_CATEGORIES (Video.ts) — these tag
// practitioner training tracks, not patient concerns.
export const COURSE_CATEGORIES = [
  'Botox & Fillers', 'Laser & Energy Devices', 'Hair Restoration',
  'Thread Lifts', 'Chemical Peels', 'PRP & Regenerative Aesthetics',
  'Body Contouring', 'Practice Management',
] as const;

export interface ICourseModule {
  title: string;
  topics: string[];
  duration: string; // free text, e.g. "3 hours" or "Day 1"
}

export interface ICourseBatch {
  label: string; // e.g. "Batch 12 — Sep 2026"
  startDate?: Date;
  endDate?: Date;
  seatsTotal?: number;
  seatsFilled?: number;
  status: 'upcoming' | 'open' | 'closed' | 'completed';
}

export interface ICourse extends Document {
  title: string;
  slug: string;
  category: string;
  shortDescription: string;
  description: string;
  thumbnail?: { url: string; publicId?: string };
  gallery: Array<{ url: string; publicId?: string }>;
  format: 'in-person' | 'online' | 'hybrid';
  level: 'beginner' | 'intermediate' | 'advanced';
  durationLabel: string;
  curriculum: ICourseModule[];
  // Multiple faculty per course — references real Doctor docs so
  // photo/name/title stay canonical, same pattern as Video.doctor and
  // Banner.doctorHighlight.doctorId.
  instructors: mongoose.Types.ObjectId[];
  certificationName: string;
  fee: {
    amount: number;
    currency: string;
    discountedAmount?: number;
    installmentsAvailable: boolean;
  };
  batches: ICourseBatch[];
  eligibility: string[];
  highlights: string[];
  brochure?: { url: string; publicId?: string };
  featured: boolean;
  displayOrder: number;
  status: 'draft' | 'published';
  // SEO — identical field set to Video.ts, same reasoning (AI keyword
  // tooling + admin UI pattern already proven there).
  metaTitle?: string;
  metaDescription?: string;
  keywords: string[];
  canonicalUrl?: string;
  ogImage?: { url: string; publicId?: string };
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, minlength: 3 },
    slug: { type: String, lowercase: true, match: /^[a-z0-9-]+$/, index: true, unique: true, sparse: true },
    category: { type: String, required: true, enum: COURSE_CATEGORIES },
    shortDescription: { type: String, default: '' },
    description: { type: String, default: '' },
    thumbnail: { url: String, publicId: String },
    gallery: [{ url: String, publicId: String }],
    format: { type: String, enum: ['in-person', 'online', 'hybrid'], default: 'in-person' },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    durationLabel: { type: String, default: '' },
    curriculum: [{ title: String, topics: [String], duration: String }],
    instructors: [{ type: Schema.Types.ObjectId, ref: 'Doctor' }],
    certificationName: { type: String, default: '' },
    fee: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' },
      discountedAmount: { type: Number },
      installmentsAvailable: { type: Boolean, default: false },
    },
    batches: [{
      label: String,
      startDate: Date,
      endDate: Date,
      seatsTotal: Number,
      seatsFilled: Number,
      status: { type: String, enum: ['upcoming', 'open', 'closed', 'completed'], default: 'upcoming' },
    }],
    eligibility: [String],
    highlights: [String],
    brochure: { url: String, publicId: String },
    featured: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
    status: { type: String, default: 'draft', enum: ['draft', 'published'] },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    keywords: [String],
    canonicalUrl: { type: String, default: '' },
    ogImage: { url: String, publicId: String },
  },
  { timestamps: true }
);

CourseSchema.pre('save', function () {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
});

export const Course = mongoose.models.Course || mongoose.model<ICourse>('Course', CourseSchema);
