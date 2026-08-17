import mongoose, { Schema, Document } from 'mongoose';

// Old→new URL redirect candidates, generated from an imported old-site
// sitemap (or GSC's historical indexed-URL list — see
// app/lib/domainMigration/), reviewed and approved by an admin before ever
// serving as a real redirect (app/not-found.tsx — Phase 3, not built yet
// as of this model's introduction). Deliberately its own collection, not
// embedded on Settings — same structural reasoning as CustomAnalyticsEvent:
// this needs an independent per-row lifecycle (suggested → approved/
// rejected), not a single shared config document.
export const REDIRECT_MAPPING_STATUSES = ['suggested', 'approved', 'rejected', 'no_match'] as const;
export type RedirectMappingStatus = (typeof REDIRECT_MAPPING_STATUSES)[number];

export const REDIRECT_MAPPING_MATCH_TYPES = ['exact', 'rule', 'ai', 'manual'] as const;
export type RedirectMappingMatchType = (typeof REDIRECT_MAPPING_MATCH_TYPES)[number];

export interface IRedirectMapping extends Document {
  oldUrl: string; // normalized pathname (see parseSitemap.ts's normalizeUrl)
  newUrl: string | null; // null only while unmatched or confirmed no_match
  matchType: RedirectMappingMatchType | null;
  confidence: number; // 0-100
  confidenceLevel: 'High' | 'Medium' | 'Low' | null;
  status: RedirectMappingStatus;
  reasoning: string;
  sitemapImportBatch: string;
  reviewedBy: string;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const RedirectMappingSchema = new Schema<IRedirectMapping>(
  {
    oldUrl: { type: String, required: true, trim: true, unique: true },
    newUrl: { type: String, default: null },
    matchType: { type: String, enum: [...REDIRECT_MAPPING_MATCH_TYPES, null], default: null },
    confidence: { type: Number, default: 0, min: 0, max: 100 },
    confidenceLevel: { type: String, enum: ['High', 'Medium', 'Low', null], default: null },
    status: { type: String, enum: REDIRECT_MAPPING_STATUSES, default: 'suggested', index: true },
    reasoning: { type: String, default: '' },
    sitemapImportBatch: { type: String, required: true, index: true },
    reviewedBy: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Fast "give me everything approved" for the redirect-serving lookup
// (Phase 3) — a single indexed field, no compound needed since that
// query has no other filter.
RedirectMappingSchema.index({ status: 1 });

export const RedirectMapping =
  mongoose.models.RedirectMapping ||
  mongoose.model<IRedirectMapping>('RedirectMapping', RedirectMappingSchema);
