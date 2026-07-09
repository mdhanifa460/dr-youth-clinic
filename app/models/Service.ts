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
      enum: ['chennai', 'bangalore', 'coimbatore', 'kochi'],
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
    const city = this.location.charAt(0).toUpperCase() + this.location.slice(1);
    this.metaTitle = `${this.name} in ${city} | DR Youth Clinic`;
  }
});

export const Service = mongoose.models.Service || mongoose.model('Service', ServiceSchema);
