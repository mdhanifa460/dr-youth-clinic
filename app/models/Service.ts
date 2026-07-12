import mongoose, { Schema, Document } from 'mongoose';

export interface IService extends Document {
  // Basic Info
  name: string;
  internalCode: string;
  location: string;
  category: 'Skin' | 'Hair' | 'Laser' | 'Other';

  // SEO
  metaTitle: string;
  metaDescription: string;
  urlSlug: string;
  keywords: string[];
  seoScore?: number;

  // Content
  narrative: string;
  heroDescription?: string;
  idealFor?: string[];
  sessionsRequired?: string;
  recoveryTime?: string;
  technology?: string;
  anaesthesia?: string;
  recoveryStages?: Array<{ phase: string; icon: string; label: string; description: string }>;
  sessionsCount?: number;
  journeyPhases?: Array<{ title: string; description: string }>;
  treatmentSteps?: Array<{ title: string; description: string }>;
  myths?: Array<{ myth: string; fact: string }>;
  faq?: Array<{ question: string; answer: string }>;
  benefits: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  whyChooseUs?: string[];

  // Interactive Journey Explorer — fixed, doctor-authored stages (distinct from
  // the AI-personalised journey simulator, which stays free-text/AI-generated).
  journeyExplorer?: Array<{
    stage: string;
    progressPercent: number;
    summary: string;
    doctorTip?: string;
    dos?: string[];
    donts?: string[];
    faqs?: Array<{ question: string; answer: string }>;
  }>;
  journeyExplorerVisible: boolean;

  // Treatment Comparison — most fields reuse existing price/duration/
  // sessionsRequired/recoveryTime/idealFor; painLevel is the only new axis.
  painLevel?: 'None' | 'Mild' | 'Moderate' | 'High';
  comparisonVisible: boolean;

  // Aftercare Calendar
  aftercareGuidance?: Array<{ activity: string; waitPeriod?: string; guidance: string }>;
  aftercareVisible: boolean;

  // Media
  heroImage: {
    url: string;
    publicId: string;
  };
  beforeAfterImages: Array<{
    before: { url: string; publicId: string };
    after: { url: string; publicId: string };
  }>;

  // Pricing & Duration
  price: number;
  duration: number;
  currency: string;

  // Status
  status: 'draft' | 'active' | 'hidden';
  publishedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters'],
    },
    internalCode: {
      type: String,
      unique: true,
      index: true,
      match: /^SRV-\d{3}$/,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      // 'all' shows the same service at every clinic location instead of
      // requiring a separate duplicate document per city.
      enum: ['all', 'chennai', 'bangalore', 'coimbatore', 'kochi'],
      lowercase: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Skin', 'Hair', 'Laser', 'Other'],
    },

    // SEO
    metaTitle: {
      type: String,
      maxlength: [60, 'Meta title should be max 60 characters'],
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description should be max 160 characters'],
    },
    urlSlug: {
      type: String,
      lowercase: true,
      match: /^[a-z0-9-]+$/,
      index: true,
    },
    keywords: [String],
    seoScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Content
    narrative: {
      type: String,
      maxlength: 5000,
    },
    heroDescription: {
      type: String,
      maxlength: 220,
    },
    idealFor: [String],
    sessionsRequired: { type: String, default: '' },
    recoveryTime: { type: String, default: '' },
    technology: { type: String, default: '' },
    anaesthesia: { type: String, default: '' },
    recoveryStages: [{ phase: String, icon: String, label: String, description: String }],
    sessionsCount: { type: Number, default: 6, min: 1, max: 30 },
    journeyPhases: [{ title: String, description: String }],
    treatmentSteps: [{ title: String, description: String }],
    myths: [{ myth: String, fact: String }],
    faq: [{ question: String, answer: String }],
    benefits: [
      {
        icon: String,
        title: String,
        description: String,
      },
    ],
    whyChooseUs: [String],

    journeyExplorer: [
      {
        stage: String,
        progressPercent: { type: Number, min: 0, max: 100, default: 0 },
        summary: String,
        doctorTip: String,
        dos: [String],
        donts: [String],
        faqs: [{ question: String, answer: String }],
      },
    ],
    journeyExplorerVisible: { type: Boolean, default: true },

    painLevel: { type: String, enum: ['None', 'Mild', 'Moderate', 'High'] },
    comparisonVisible: { type: Boolean, default: true },

    aftercareGuidance: [
      {
        activity: String,
        waitPeriod: String,
        guidance: String,
      },
    ],
    aftercareVisible: { type: Boolean, default: true },

    // Media
    heroImage: {
      url: String,
      publicId: String,
    },
    beforeAfterImages: [
      {
        before: {
          url: String,
          publicId: String,
        },
        after: {
          url: String,
          publicId: String,
        },
      },
    ],

    // Pricing
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: 5,
      max: 480,
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR'],
    },

    // Status
    status: {
      type: String,
      default: 'draft',
      enum: ['draft', 'active', 'hidden'],
    },
    publishedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Deterministic content-completeness score (0-100) — not a live search-ranking
// signal, just how much of the on-page/SEO content an admin has actually filled
// in. Recomputed on every save so it stays honest as content changes.
function computeSeoScore(svc: any): number {
  let score = 0;
  const metaTitleLen = svc.metaTitle?.length ?? 0;
  const metaDescLen = svc.metaDescription?.length ?? 0;

  if (metaTitleLen >= 30 && metaTitleLen <= 60) score += 15;
  else if (metaTitleLen > 0) score += 7;

  if (metaDescLen >= 70 && metaDescLen <= 160) score += 15;
  else if (metaDescLen > 0) score += 7;

  if ((svc.keywords?.length ?? 0) >= 3) score += 10;
  if (svc.urlSlug) score += 5;
  if (svc.heroImage?.url) score += 10;
  if ((svc.narrative?.length ?? 0) >= 300) score += 15;
  if (svc.heroDescription) score += 10;
  if ((svc.benefits?.length ?? 0) >= 3) score += 10;
  if ((svc.faq?.length ?? 0) >= 3) score += 10;

  return score;
}

// Auto-generate fields before save.
// Mongoose 6+: async hooks resolve via the returned Promise — do NOT call next().
ServiceSchema.pre('save', async function () {
  if (!this.internalCode) {
    const count = await mongoose.model('Service').countDocuments();
    this.internalCode = `SRV-${String(count + 1).padStart(3, '0')}`;
  }

  if (!this.urlSlug && this.name) {
    this.urlSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  if (!this.metaTitle && this.name) {
    this.metaTitle = this.location === 'all'
      ? `${this.name} | DR Youth Clinic`
      : `${this.name} in ${this.location.charAt(0).toUpperCase() + this.location.slice(1)} | DR Youth Clinic`;
  }

  this.seoScore = computeSeoScore(this);
});

// The admin edit route updates via findByIdAndUpdate, which bypasses the
// 'save' hook above — recompute the score here too so it stays accurate
// after edits, not just on creation.
ServiceSchema.pre('findOneAndUpdate', function () {
  const update: any = this.getUpdate();
  if (!update) return;
  const target = update.$set ?? update;
  if (target && typeof target === 'object') {
    target.seoScore = computeSeoScore(target);
  }
});

export const Service = mongoose.models.Service || mongoose.model('Service', ServiceSchema);
