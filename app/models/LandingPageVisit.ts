import mongoose, { Schema, Document } from 'mongoose';

// One row per real landing-page visit (app/api/lp/[slug]/visit/route.ts) —
// LandingPage.analytics.visitors is just a running counter with nothing
// behind it to click into; this is the actual log that counter summarizes,
// so an admin can open "247 visitors" and see who/when/from-where instead
// of just the number. Same privacy stance as checkIpRisk/adminAuth
// elsewhere in this codebase: the IP itself is never stored, only a
// one-way hash, enough to notice "same visitor came back" without keeping
// a reversible record of anyone's address.
export interface ILandingPageVisit extends Document {
  landingPageId: mongoose.Types.ObjectId;
  slug: string;
  source: string;
  medium: string;
  campaign: string;
  referrer: string;
  device: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  ipHash: string;
  createdAt: Date;
}

const LandingPageVisitSchema = new Schema<ILandingPageVisit>(
  {
    landingPageId: { type: Schema.Types.ObjectId, ref: 'LandingPage', required: true, index: true },
    slug: { type: String, required: true, index: true },
    source: { type: String, default: '', maxlength: 100 },
    medium: { type: String, default: '', maxlength: 100 },
    campaign: { type: String, default: '', maxlength: 150 },
    referrer: { type: String, default: '', maxlength: 300 },
    device: { type: String, enum: ['mobile', 'tablet', 'desktop', 'unknown'], default: 'unknown' },
    ipHash: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LandingPageVisitSchema.index({ landingPageId: 1, createdAt: -1 });
// Rolling 180-day retention — this is a diagnostic/attribution log, not a
// permanent record; the summary counter on LandingPage itself never expires.
LandingPageVisitSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

export const LandingPageVisit =
  mongoose.models.LandingPageVisit || mongoose.model<ILandingPageVisit>('LandingPageVisit', LandingPageVisitSchema);
