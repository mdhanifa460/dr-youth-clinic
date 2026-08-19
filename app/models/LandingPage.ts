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
  // Which city this specific page/URL is the campaign for — lets an admin
  // duplicate one campaign into a per-city variant (each its own URL, own
  // analytics.visitors/leads) and then filter/compare them side by side in
  // the admin list. Deliberately not carried over by the duplicate route —
  // every copy must have its own city explicitly (re-)selected. Empty
  // string means "not set / not city-specific", not a fifth city.
  city: string;
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
  // Dormant: the public read path (app/lp/[slug]/page.tsx) hardcodes
  // variant="A" and never reads variantB.sections — there is no live
  // traffic-split logic anywhere. Formally deprecated rather than silently
  // removed (avoids a destructive schema change against existing data) —
  // building real variant selection is a distinct feature from the Content
  // Layout Engine and was left undecided pending a product call on whether
  // it's worth finishing or should be deleted outright.
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
  // Content Layout Engine opt-in — same pattern as Service/Blog. When on,
  // extra registry-driven sections render after the existing `sections[]`
  // (still rendered by LpRenderer, untouched) and before the footer.
  layoutEngineEnabled?: boolean;
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
    city: {
      type: String,
      default: '',
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
    layoutEngineEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Matches the { status: 'published' } filter used by the sitemap and the
// media-usage audit — slug already has its own unique index above.
LandingPageSchema.index({ status: 1 });

export const LandingPage =
  mongoose.models.LandingPage ||
  mongoose.model<ILandingPage>('LandingPage', LandingPageSchema);
