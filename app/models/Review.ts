import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  source: string;
  sourceId?: string;
  authorName: string;
  authorAvatar?: string;
  rating?: number;
  reviewText?: string;
  videoUrl?: string;
  videoThumbnail?: string;
  services: string[];
  location?: string;
  isFeatured: boolean;
  isVisible: boolean;
  showOnHomepage: boolean;
  displayOrder: number;
  reviewDate?: Date;
  meta: Record<string, any>;
  syncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    source: {
      type: String,
      required: true,
    },
    sourceId: {
      type: String,
    },
    authorName: {
      type: String,
      required: true,
    },
    authorAvatar: {
      type: String,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    reviewText: {
      type: String,
    },
    videoUrl: {
      type: String,
    },
    videoThumbnail: {
      type: String,
    },
    services: {
      type: [String],
      default: [],
    },
    location: {
      type: String,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    showOnHomepage: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    reviewDate: {
      type: Date,
    },
    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
    syncedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Prevents importing the same Google/synced review twice — but must NEVER
// apply to manual reviews, which never have a sourceId at all. A `sparse`
// index only excludes documents where the field is entirely absent; once
// even one document is saved with sourceId explicitly `null` (as every
// manual review naturally is), MongoDB treats that null as a real indexed
// value and the FIRST manual review permanently blocks every manual review
// created after it with a duplicate-key error. A partial index filtered to
// "sourceId is an actual string" is the correct fix — null/missing values
// are never subject to the uniqueness constraint at all.
ReviewSchema.index(
  { source: 1, sourceId: 1 },
  { unique: true, partialFilterExpression: { sourceId: { $type: 'string' } } }
);

ReviewSchema.index({
  isVisible: 1,
  showOnHomepage: 1,
  isFeatured: -1,
  displayOrder: 1,
});

ReviewSchema.index({ source: 1 });
ReviewSchema.index({ location: 1 });

export const Review =
  mongoose.models.Review ||
  mongoose.model<IReview>('Review', ReviewSchema);
