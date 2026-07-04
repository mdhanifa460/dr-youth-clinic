import mongoose, { Schema, Document } from 'mongoose';

export interface ILandingPageSection {
  id: string;
  type: string;
  visible: boolean;
  data: Record<string, any>;
}

export interface IFormField {
  id: string;
  label: string;
  type: 'text' | 'tel' | 'email' | 'select' | 'textarea';
  placeholder: string;
  required: boolean;
  options?: string[];
}

export interface ILandingPage extends Document {
  title: string;
  slug: string;
  status: 'draft' | 'published';
  template: string;
  seo: {
    title: string;
    description: string;
    keywords: string;
    ogImage: string;
  };
  sections: ILandingPageSection[];
  form: {
    fields: IFormField[];
    submitText: string;
    successMessage: string;
    whatsappNotify: boolean;
  };
  tracking: {
    gtmId: string;
    metaPixelId: string;
    googleAdsId: string;
    googleAdsLabel: string;
  };
  abTest: {
    enabled: boolean;
    variantB: {
      sections: ILandingPageSection[];
      leads: number;
      visitors: number;
    };
  };
  analytics: {
    visitors: number;
    leads: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const FormFieldSchema = new Schema<IFormField>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['text', 'tel', 'email', 'select', 'textarea'],
    },
    placeholder: { type: String, default: '' },
    required: { type: Boolean, default: false },
    options: [String],
  },
  { _id: false }
);

const SectionSchema = new Schema<ILandingPageSection>(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    visible: { type: Boolean, default: true },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const LandingPageSchema = new Schema<ILandingPage>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'],
      index: true,
    },
    status: {
      type: String,
      default: 'draft',
      enum: ['draft', 'published'],
    },
    template: {
      type: String,
      default: 'hair-prp',
    },
    seo: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      keywords: { type: String, default: '' },
      ogImage: { type: String, default: '' },
    },
    sections: [SectionSchema],
    form: {
      fields: [FormFieldSchema],
      submitText: { type: String, default: 'Book Free Consultation' },
      successMessage: { type: String, default: "Thank you! We'll call you within 2 hours." },
      whatsappNotify: { type: Boolean, default: false },
    },
    tracking: {
      gtmId: { type: String, default: '' },
      metaPixelId: { type: String, default: '' },
      googleAdsId: { type: String, default: '' },
      googleAdsLabel: { type: String, default: '' },
    },
    abTest: {
      enabled: { type: Boolean, default: false },
      variantB: {
        sections: [SectionSchema],
        leads: { type: Number, default: 0 },
        visitors: { type: Number, default: 0 },
      },
    },
    analytics: {
      visitors: { type: Number, default: 0 },
      leads: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const LandingPage =
  mongoose.models.LandingPage ||
  mongoose.model<ILandingPage>('LandingPage', LandingPageSchema);
