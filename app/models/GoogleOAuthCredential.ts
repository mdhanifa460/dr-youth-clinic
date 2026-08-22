import mongoose, { Schema, Document } from 'mongoose';

// Dedicated singleton for a Google OAuth 2.0 delegated-user grant (refresh
// token) — deliberately SEPARATE from:
//   - ConnectorCredential (CRM connectors' own oauth2 authType) — that
//     model requires a `connectorId` FK into the CRM `Connector`
//     collection and is scoped to that domain; forcing an unrelated Google
//     grant into it would misuse its schema, not reuse it.
//   - GOOGLE_SERVICE_ACCOUNT_JSON / Workload Identity Federation (see
//     app/lib/google/workloadIdentityAuth.ts) — those are machine-to-
//     machine, no human consent, no refresh token to store at all. This
//     model exists ONLY for flows that need a real user's delegated
//     consent (Site Verification API requires this — a service account
//     cannot verify site ownership on its own).
//
// `provider` keys this per Google API/scope-set (only "site_verification"
// today) so a second, unrelated delegated-user grant later doesn't need a
// schema change or a second collection — same empty-filter-per-key upsert
// convention as GoogleReviewSyncState.ts's own singleton pattern.
//
// The access token is deliberately NEVER persisted — it's short-lived
// (~1 hour) and trivially re-derived from the refresh token on demand, so
// there's nothing gained by storing it and one less secret to protect at
// rest. Only the refresh token is stored, and only encrypted (see
// app/lib/crm/encryption.ts — reused as-is, not duplicated).
export interface IGoogleOAuthCredential extends Document {
  provider: string;
  encryptedRefreshToken: { encrypted: string; iv: string; authTag: string } | null;
  refreshTokenLast4: string;
  scope: string;
  connectedByAdminId: string;
  connectedByEmail: string;
  connectedAt: Date | null;
  revokedAt: Date | null;
  updatedAt: Date;
}

const GoogleOAuthCredentialSchema = new Schema<IGoogleOAuthCredential>(
  {
    provider: { type: String, required: true, unique: true, index: true },
    encryptedRefreshToken: {
      type: {
        encrypted: { type: String, required: true },
        iv: { type: String, required: true },
        authTag: { type: String, required: true },
      },
      default: null,
    },
    refreshTokenLast4: { type: String, default: '' },
    scope: { type: String, default: '' },
    connectedByAdminId: { type: String, default: '' },
    connectedByEmail: { type: String, default: '' },
    connectedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const GoogleOAuthCredential =
  mongoose.models.GoogleOAuthCredential ||
  mongoose.model<IGoogleOAuthCredential>('GoogleOAuthCredential', GoogleOAuthCredentialSchema);
