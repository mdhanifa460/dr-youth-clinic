import mongoose, { Schema, Document } from 'mongoose';
import { syncKnowledgeChunk } from '@/app/lib/rag/KnowledgeBase';

export interface ILocationSeo {
  location: string;
  metaTitle?: string;
  metaDescription?: string;
  urlSlug?: string;
  // true once an admin has directly edited this city's fields — distinguishes
  // "Edited Manually" from "inherited from the shared default" in the UI.
  isCustomized?: boolean;
}

export interface IService extends Document {
  // Basic Info
  name: string;
  internalCode: string;
  location: string;
  // Explicit set of cities this service is shown at (e.g. ['chennai','bangalore','kochi']).
  // Optional and additive — documents created before this existed have no
  // targetLocations, and fall back to the legacy single `location` field
  // (a specific city, or 'all' meaning every city) everywhere this is read.
  targetLocations?: string[];
  category: 'Skin' | 'Hair' | 'Laser' | 'Other';

  // SEO
  metaTitle: string;
  metaDescription: string;
  urlSlug: string;
  keywords: string[];
  seoScore?: number;
  // Sparse per-city overrides of metaTitle/metaDescription/urlSlug — only
  // cities that differ from the shared defaults above need an entry here.
  // This is what lets one service (shared treatment content) rank
  // independently in each city instead of requiring a duplicate document
  // per city just to vary the title.
  locationSeo?: ILocationSeo[];

  // Content
  narrative: string;
  // Structured Content Block Builder version of `narrative` — additive; when
  // present, the public page renders this instead of the plain-text
  // `narrative` paragraph. `narrative` stays as the fallback for services
  // that haven't been converted to blocks yet, and as the plain-text source
  // for SEO meta description / schema.org fallbacks when blocks are absent.
  narrativeBlocks?: Array<{ id: string; type: string; visible: boolean; data: Record<string, any> }>;
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
      // requiring a separate duplicate document per city. Kept as a
      // required legacy field (auto-derived from targetLocations on save
      // when that's set) so every existing query that reads `location`
      // keeps working without a migration.
      enum: ['all', 'chennai', 'bangalore', 'coimbatore', 'kochi'],
      lowercase: true,
    },
    targetLocations: {
      type: [String],
      enum: ['chennai', 'bangalore', 'coimbatore', 'kochi'],
      default: undefined,
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
    locationSeo: {
      type: [
        {
          location: { type: String, enum: ['chennai', 'bangalore', 'coimbatore', 'kochi'], required: true },
          metaTitle: { type: String, maxlength: 60 },
          metaDescription: { type: String, maxlength: 160 },
          urlSlug: { type: String, lowercase: true, match: /^[a-z0-9-]+$/ },
          isCustomized: { type: Boolean, default: false },
        },
      ],
      default: undefined,
    },

    // Content
    narrative: {
      type: String,
      maxlength: 5000,
    },
    narrativeBlocks: {
      type: [
        {
          id: { type: String, required: true },
          type: { type: String, required: true },
          visible: { type: Boolean, default: true },
          data: { type: Schema.Types.Mixed, default: {} },
        },
      ],
      default: undefined,
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

    // Optional — the admin form defaults this to '' when unset, and Mongoose's
    // enum validator (unlike `required`) rejects '' since it isn't one of the
    // listed values. Treat blank as "not answered" instead of an invalid pick.
    painLevel: {
      type: String,
      enum: ['None', 'Mild', 'Moderate', 'High'],
      set: (v: string) => (v === '' ? undefined : v),
    },
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

// Keeps the RAG knowledge base (KnowledgeChunk) in sync whenever a service is
// created or edited. Fire-and-forget + logged, never allowed to fail the
// actual save — a knowledge-base sync hiccup must not block admin content edits.
ServiceSchema.post('save', function (doc) {
  syncKnowledgeChunk('service', doc).catch((e) => console.error('[KB] service sync failed', e));
});

// pre('findOneAndUpdate') above only has the update payload, not the full
// resulting document — insufficient for a knowledge chunk, which needs the
// complete name/narrative/benefits/faq. Every admin PUT route already passes
// {new: true}, so post('findOneAndUpdate') receives the updated doc directly.
ServiceSchema.post('findOneAndUpdate', function (doc) {
  if (doc) syncKnowledgeChunk('service', doc).catch((e) => console.error('[KB] service sync failed', e));
});

export const Service = mongoose.models.Service || mongoose.model('Service', ServiceSchema);
