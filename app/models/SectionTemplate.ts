import mongoose, { Schema, Document } from 'mongoose';

export interface ISectionTemplate extends Document {
  name: string;
  type: string;
  icon: string;
  data: Record<string, any>;
  // Which builder this was saved from — templates are only offered back to
  // the same system's "Insert Template" picker, since section `type`
  // registries differ between Landing Pages / Homepage / About / Content
  // Blocks. Content Blocks gets two values (not one shared 'content-block')
  // because Service and Blog sit behind different admin permission modules
  // ('services' vs 'blog') — one shared value couldn't map to both correctly.
  sourceSystem: 'landing-page' | 'homepage' | 'about' | 'content-block-service' | 'content-block-blog';
  createdAt: Date;
  updatedAt: Date;
}

const SectionTemplateSchema = new Schema<ISectionTemplate>(
  {
    name: { type: String, required: [true, 'Template name is required'], trim: true },
    type: { type: String, required: true },
    icon: { type: String, default: '' },
    data: { type: Schema.Types.Mixed, default: {} },
    sourceSystem: { type: String, enum: ['landing-page', 'homepage', 'about', 'content-block-service', 'content-block-blog'], required: true },
  },
  { timestamps: true }
);

export const SectionTemplate =
  mongoose.models.SectionTemplate || mongoose.model<ISectionTemplate>('SectionTemplate', SectionTemplateSchema);
