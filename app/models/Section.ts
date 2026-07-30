import mongoose, { Schema, Document } from 'mongoose';

// The shared Content Layout Engine's section-instance model. One document
// per section placed on one page. Cross-cutting placement/behavior fields
// are typed columns; section-type-specific authored fields live in `content`
// (Mixed — the Mongo equivalent of a JSONB column).
//
// `condition` is deliberately a single flat comparison, not a rule engine —
// Personalization Rules / a full Conditions evaluator are out of scope for
// this phase.
export type SectionPageType =
  | 'home'
  | 'service'
  | 'blog'
  | 'landing'
  | 'doctor'
  | 'location'
  | 'offer';

export type SectionZone = 'hero' | 'main' | 'sidebar' | 'related' | 'before-footer';

export interface ISectionCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'exists';
  value?: any;
}

export interface ISection extends Document {
  pageType: SectionPageType;
  pageId: mongoose.Types.ObjectId;
  sectionType: string;
  variant: string;
  zone: SectionZone;
  displayOrder: number;
  enabled: boolean;
  desktopVisible: boolean;
  tabletVisible: boolean;
  mobileVisible: boolean;
  spacing: 'none' | 'compact' | 'default' | 'loose';
  background: 'transparent' | 'light' | 'dark' | 'brand';
  animationPreset: string;
  theme: 'light' | 'dark' | 'inherit';
  sticky: boolean;
  collapsible: boolean;
  condition?: ISectionCondition;
  content: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const SectionConditionSchema = new Schema<ISectionCondition>(
  {
    field: { type: String, required: true },
    operator: { type: String, enum: ['eq', 'neq', 'gt', 'lt', 'exists'], required: true },
    value: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const SectionSchema = new Schema<ISection>(
  {
    pageType: {
      type: String,
      enum: ['home', 'service', 'blog', 'landing', 'doctor', 'location', 'offer'],
      required: true,
      index: true,
    },
    pageId: { type: Schema.Types.ObjectId, required: true, index: true },
    sectionType: { type: String, required: true },
    variant: { type: String, required: true, default: 'default' },
    zone: {
      type: String,
      enum: ['hero', 'main', 'sidebar', 'related', 'before-footer'],
      required: true,
    },
    displayOrder: { type: Number, required: true, default: 0 },
    enabled: { type: Boolean, default: true },
    desktopVisible: { type: Boolean, default: true },
    tabletVisible: { type: Boolean, default: true },
    mobileVisible: { type: Boolean, default: true },
    spacing: { type: String, enum: ['none', 'compact', 'default', 'loose'], default: 'default' },
    background: { type: String, enum: ['transparent', 'light', 'dark', 'brand'], default: 'transparent' },
    animationPreset: { type: String, default: 'none' },
    theme: { type: String, enum: ['light', 'dark', 'inherit'], default: 'inherit' },
    sticky: { type: Boolean, default: false },
    collapsible: { type: Boolean, default: false },
    condition: { type: SectionConditionSchema, required: false },
    content: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Every page load resolves "give me this page's sections, in zone/order" —
// this is the one query the Layout Engine actually runs.
SectionSchema.index({ pageType: 1, pageId: 1, zone: 1, displayOrder: 1 });

export const Section = mongoose.models.Section || mongoose.model<ISection>('Section', SectionSchema);
