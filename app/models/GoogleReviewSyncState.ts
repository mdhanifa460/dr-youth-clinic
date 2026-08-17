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
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const GoogleReviewSyncState =
  mongoose.models.GoogleReviewSyncState ||
  mongoose.model<IGoogleReviewSyncState>('GoogleReviewSyncState', GoogleReviewSyncStateSchema);
