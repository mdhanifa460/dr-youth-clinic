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
      maxlength: 2000,
    },
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

// Auto-generate internal code
ServiceSchema.pre('save', async function (next: any) {
  if (!this.internalCode) {
    const count = await mongoose.model('Service').countDocuments();
    this.internalCode = `SRV-${String(count + 1).padStart(3, '0')}`;
  }

  // Auto-generate URL slug from name
  if (!this.urlSlug && this.name) {
    this.urlSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  next();
});

// Auto-generate meta title if not provided
ServiceSchema.pre('save', function (next: any) {
  if (!this.metaTitle && this.name) {
    this.metaTitle = `${this.name} in ${this.location.charAt(0).toUpperCase() + this.location.slice(1)} | DR Youth Clinic`;
  }
  return next();
});

export const Service = mongoose.models.Service || mongoose.model('Service', ServiceSchema);
