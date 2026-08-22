import mongoose, { Schema, Document } from 'mongoose';

// The configurable Source/Channel/Branch mapping layer — the answer to
// "we have multiple branches, and each branch has its OWN JustDial
// listing, IndiaMART account, WhatsApp number, etc., so `source alone`
// can never tell you which branch a lead belongs to." A single row here
// says "this exact provider account/phone/WhatsApp number belongs to
// this branch" — resolved at lead-ingestion time (see resolveBranch.ts),
// never hardcoded into any webhook/route's own logic. Adding a second
// Chennai JustDial listing, or a Coimbatore branch's IndiaMART account,
// is an admin action here — never a code change.
//
// source and sourceAccount/sourcePhone/whatsappPhoneNumberId are kept
// deliberately separate from `branch`: a lead's SOURCE ATTRIBUTION
// (where it came from — JustDial listing JD-CHN-001) and its BRANCH
// ATTRIBUTION (which clinic it should route to — Chennai) are two
// different facts. This mapping is what connects them; neither one
// implies the other on its own once a business has more than one
// branch on the same provider.
export interface ILeadSourceMapping extends Document {
  // Admin-facing name — "Justdial Listing A (Chennai)", not derived from
  // the identifiers below, since a listing ID alone is rarely memorable.
  label: string;
  // Not a fixed enum — the whole point of this layer is that new
  // source channels (a second SMS gateway, a new listing site) are an
  // admin action, never a code change. The admin UI offers the common
  // values (justdial, indiamart, whatsapp, website, google, facebook,
  // just_dial, referral, phone) as suggestions, not a hard constraint.
  source: string;
  // PRIMARY identifier for JustDial/IndiaMART — their own listing ID,
  // account ID, campaign ID, or lead ID from the webhook/API payload,
  // when one is available. Prefer this over phone number: a provider
  // account can rotate its displayed phone number without changing its
  // account/listing ID, which would silently break a phone-only mapping.
  providerAccountId: string;
  // SECONDARY/additional identifier — the provider-side phone number.
  // Used as a fallback match when no providerAccountId is available on
  // a given payload, and kept even when providerAccountId IS set, since
  // some providers' webhooks only carry one or the other depending on
  // the event type.
  providerPhone: string;
  // WhatsApp-specific — Meta's own phone_number_id (NOT the phone number
  // itself) for the WhatsApp Business number this row represents. This is
  // also what an inbound-message handler and outbound sender resolution
  // key off of, so multiple WhatsApp Business numbers (one per branch)
  // route correctly in both directions.
  whatsappPhoneNumberId: string;
  // Which branch this exact source+account+phone combination belongs to
  // — matches the same location slug used everywhere else in this
  // codebase (chennai/bangalore/coimbatore/kochi/...), not a separate ID
  // space, so this plugs directly into getClinicNotifyNumber/
  // getEffectiveBranchConfig/LocationContent without a translation layer.
  branch: string;
  active: boolean;
  // Free-form, provider-specific extras (e.g. a JustDial campaign name, an
  // IndiaMART catalog ID) that don't need their own top-level field but
  // are worth keeping alongside the mapping for reference/debugging.
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSourceMappingSchema = new Schema<ILeadSourceMapping>(
  {
    label: { type: String, required: true, trim: true },
    source: { type: String, required: true, trim: true, lowercase: true },
    providerAccountId: { type: String, default: '', trim: true },
    providerPhone: { type: String, default: '', trim: true },
    whatsappPhoneNumberId: { type: String, default: '', trim: true },
    branch: { type: String, required: true, trim: true, lowercase: true },
    active: { type: Boolean, default: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// A resolver lookup is always scoped to `source` first (see
// resolveBranch.ts) — these three cover its three lookup strategies
// (providerAccountId primary, providerPhone fallback, whatsappPhoneNumberId
// for the WhatsApp-specific path) without a full collection scan. Not
// declared `unique` — a provider could conceivably reuse a phone number
// across two now-inactive/reassigned listings over time, and the resolver
// (not the schema) is what enforces "pick the right one," filtering to
// active:true and disambiguating by recency if more than one row somehow
// matches.
LeadSourceMappingSchema.index({ source: 1, providerAccountId: 1 });
LeadSourceMappingSchema.index({ source: 1, providerPhone: 1 });
LeadSourceMappingSchema.index({ source: 1, whatsappPhoneNumberId: 1 });

export const LeadSourceMapping =
  mongoose.models.LeadSourceMapping || mongoose.model<ILeadSourceMapping>('LeadSourceMapping', LeadSourceMappingSchema);
