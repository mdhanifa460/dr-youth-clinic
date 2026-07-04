import mongoose, { Schema, Document } from 'mongoose';

export interface ILandingPageLead extends Document {
  lpId: mongoose.Types.ObjectId;
  slug: string;
  variant: 'A' | 'B';
  name: string;
  phone: string;
  email: string;
  fields: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const LandingPageLeadSchema = new Schema<ILandingPageLead>(
  {
    lpId: {
      type: Schema.Types.ObjectId,
      ref: 'LandingPage',
      required: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      index: true,
    },
    variant: {
      type: String,
      enum: ['A', 'B'],
      default: 'A',
    },
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    fields: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const LandingPageLead =
  mongoose.models.LandingPageLead ||
  mongoose.model<ILandingPageLead>('LandingPageLead', LandingPageLeadSchema);
