import mongoose, { Schema, Document } from 'mongoose';

export interface ISectionTemplate extends Document {
  name: string;
  type: string;
  icon: string;
  data: Record<string, any>;
  // Which builder this was saved from — templates are only offered back to
  // the same system's "Insert Template" picker, since section `type`
  // registries differ between Landing Pages / Homepage / About.
  sourceSystem: 'landing-page' | 'homepage' | 'about';
  createdAt: Date;
  updatedAt: Date;
}

const SectionTemplateSchema = new Schema<ISectionTemplate>(
  {
    name: { type: String, required: [true, 'Template name is required'], trim: true },
    type: { type: String, required: true },
    icon: { type: String, default: '' },
    data: { type: Schema.Types.Mixed, default: {} },
    sourceSystem: { type: String, enum: ['landing-page', 'homepage', 'about'], required: true },
  },
  { timestamps: true }
);

export const SectionTemplate =
  mongoose.models.SectionTemplate || mongoose.model<ISectionTemplate>('SectionTemplate', SectionTemplateSchema);
