import mongoose, { Schema, Document } from 'mongoose';

// Homepage "Achievements & Awards" badges (medallion-style graphics —
// "Award Winning Clinic", "9+ Years of Excellence" etc.) —
// deliberately its own collection, not embedded in HomepageSection.data,
// so it gets real per-item add/edit/delete the same way Offer/Result do
// (see those models' own admin pages) instead of one shared JSON blob.
export interface IAchievement extends Document {
  title: string;
  image: { url: string; publicId: string };
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AchievementSchema = new Schema<IAchievement>(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    image: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AchievementSchema.index({ active: 1, order: 1 });

export const Achievement =
  mongoose.models.Achievement || mongoose.model<IAchievement>('Achievement', AchievementSchema);
