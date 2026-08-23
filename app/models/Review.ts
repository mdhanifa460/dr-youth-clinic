import mongoose, { Schema, Document } from 'mongoose';

// Report reason vocabulary — mirrors Google's own published review-policy
// categories (Prohibited and Restricted Content), NOT an open-ended free
// text field, so this can never be used to justify "it's just negative" as
// a reason. A low rating alone is never one of these categories — see
// REPORT_REASONS' own comment below and app/lib/reviews/reviewFlags.ts.
export const REPORT_REASONS = [
  'spam',
  'fake_engagement',
  'off_topic',
  'inappropriate_content',
  'harassment_or_bullying',
  'conflict_of_interest',
  'illegal_content',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

// Admin-tracked only — Google's API exposes no report/appeal status to
// poll (confirmed: reporting a review happens entirely through Google's
// own Business Profile UI, never this app). This is our own record of
// where a manually-filed report currently stands, kept in sync by the
// admin, not by any automated process.
export const REPORT_STATUSES = ['not_reported', 'reported', 'under_review', 'removed', 'rejected'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

// Reply status — also admin-tracked, not synced with Google. This app has
// no ability to actually post a reply to Google today (the current sync
// uses the read-only Places API, not the Business Profile API's
// reviews.updateReply); "sent" here means "the admin has manually posted
// this reply on Google themselves and is recording that here," not "this
// app sent it."
export const REPLY_STATUSES = ['none', 'draft', 'sent'] as const;
export type ReplyStatus = (typeof REPLY_STATUSES)[number];

// Best-effort AI signal (app/lib/reviews/analyzeReview.ts) — an ADMIN
// ASSISTANCE suggestion only, never an automated verdict. possibleReason
// is drawn from the SAME REPORT_REASONS vocabulary above so a suggestion
// and a real filed report always speak the same language, but the AI
// never writes reported/reportStatus itself — only an admin action does.
export interface IReviewAiAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative' | '';
  severity: 'low' | 'medium' | 'high' | '';
  possiblePolicyViolation: boolean;
  possibleReason: ReportReason | '';
  confidence: number | null; // 0-1
  rawExplanation: string; // the model's own short reasoning, for an admin to sanity-check the suggestion against
  analyzedAt: Date | null;
}

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
  // When a synced review's Google-owned content genuinely changed (a
  // reviewer can edit their review after posting) — distinct from
  // `syncedAt` below, which updates on every sync attempt regardless of
  // whether anything changed. Only ever set by sync-google/route.ts.
  reviewUpdatedAt?: Date;
  meta: Record<string, any>;
  syncedAt?: Date;
  // Admin-tracked reply drafting — see REPLY_STATUSES' own comment. Never
  // written by the Google sync (not a Google-owned field).
  replyText: string;
  replyStatus: ReplyStatus;
  // Admin-tracked report/removal workflow — see REPORT_STATUSES' own
  // comment. `reported` is a simple, fast filter; reportReason/reportStatus
  // carry the detail. Never written by the Google sync.
  reported: boolean;
  reportReason: ReportReason | '';
  reportStatus: ReportStatus;
  aiAnalysis?: IReviewAiAnalysis;
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
    reviewUpdatedAt: {
      type: Date,
    },
    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
    syncedAt: {
      type: Date,
    },
    replyText: {
      type: String,
      default: '',
    },
    replyStatus: {
      type: String,
      enum: REPLY_STATUSES,
      default: 'none',
    },
    reported: {
      type: Boolean,
      default: false,
    },
    reportReason: {
      type: String,
      enum: [...REPORT_REASONS, ''],
      default: '',
    },
    reportStatus: {
      type: String,
      enum: REPORT_STATUSES,
      default: 'not_reported',
    },
    aiAnalysis: {
      type: {
        sentiment: { type: String, enum: ['positive', 'neutral', 'negative', ''], default: '' },
        severity: { type: String, enum: ['low', 'medium', 'high', ''], default: '' },
        possiblePolicyViolation: { type: Boolean, default: false },
        possibleReason: { type: String, enum: [...REPORT_REASONS, ''], default: '' },
        confidence: { type: Number, default: null },
        rawExplanation: { type: String, default: '' },
        analyzedAt: { type: Date, default: null },
      },
      default: undefined,
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
