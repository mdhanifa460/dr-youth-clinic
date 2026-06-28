import mongoose, { Schema, Document } from 'mongoose';

export interface IHomepageSection extends Document {
  sectionKey: string;
  label: string;
  order: number;
  visible: boolean;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const HomepageSectionSchema = new Schema<IHomepageSection>(
  {
    sectionKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },
    visible: {
      type: Boolean,
      default: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export const HomepageSection =
  mongoose.models.HomepageSection ||
  mongoose.model<IHomepageSection>('HomepageSection', HomepageSectionSchema);
