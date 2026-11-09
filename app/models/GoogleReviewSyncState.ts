import mongoose, { Schema, Document } from 'mongoose';

// Dedicated sync-state singleton for the Google Reviews import — kept
// separate from any individual Review document's own `syncedAt` (which
// still exists per-row for "when was THIS review last confirmed against
// Google") so the cooldown/last-sync-summary has one authoritative source
// that exists even when a sync imports zero reviews, and isn't tied to
// whichever row happened to be processed last. Singleton pattern (empty
// filter, findOneAndUpdate upsert) — same convention as Settings.ts.
export interface IGoogleReviewSyncState extends Document {
  lastSyncAt: Date | null;
  lastSyncStatus: 'success' | 'error' | null;
  lastSyncCounts: { imported: number; updated: number; unchanged: number; failed: number };
  lastSyncError: string;
  // 'business_profile' (all reviews, every branch) or 'places' (older
  // single-listing Places API, at most 5 reviews).
  lastSyncSource: 'business_profile' | 'places' | null;
  // Google Business Profile listings and the branch an admin matched each
  // one to (branch '' = not imported). See app/lib/reviews/businessProfileReviews.ts.
  businessLocations: Array<{
    account: string;
    location: string;
    title: string;
    address: string;
    branch: string;
    averageRating: number | null;
    totalReviewCount: number | null;
  }>;
  updatedAt: Date;
}

const GoogleReviewSyncStateSchema = new Schema<IGoogleReviewSyncState>(
  {
    lastSyncAt: { type: Date, default: null },
    lastSyncStatus: { type: String, enum: ['success', 'error', null], default: null },
    lastSyncCounts: {
      imported: { type: Number, default: 0 },
      updated: { type: Number, default: 0 },
      unchanged: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    lastSyncError: { type: String, default: '' },
    lastSyncSource: { type: String, enum: ['business_profile', 'places', null], default: null },
    businessLocations: {
      type: [{
        _id: false,
        account: { type: String, required: true },
        location: { type: String, required: true },
        title: { type: String, default: '' },
        address: { type: String, default: '' },
        branch: { type: String, enum: ['chennai', 'bangalore', 'coimbatore', 'kochi', ''], default: '' },
        averageRating: { type: Number, default: null },
        totalReviewCount: { type: Number, default: null },
      }],
      default: [],
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const GoogleReviewSyncState =
  mongoose.models.GoogleReviewSyncState ||
  mongoose.model<IGoogleReviewSyncState>('GoogleReviewSyncState', GoogleReviewSyncStateSchema);
