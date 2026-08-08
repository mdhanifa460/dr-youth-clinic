import mongoose from "mongoose";

// 1:1 with Connector, kept in its own collection — never joined into the
// general connector list/read query, only fetched server-side at dispatch
// or test-connection time, so a bug in an admin list endpoint can't leak a
// secret. `encrypted` is AES-256-GCM ciphertext of the full credential JSON
// (see app/lib/crm/encryption.ts); plaintext never touches this document.
export type ConnectorAuthType = "api_key" | "bearer" | "oauth2" | "jwt" | "basic" | "custom_header";

const ConnectorCredentialSchema = new mongoose.Schema(
  {
    connectorId: { type: mongoose.Schema.Types.ObjectId, ref: "Connector", required: true, unique: true, index: true },
    authType: { type: String, enum: ["api_key", "bearer", "oauth2", "jwt", "basic", "custom_header"], required: true },

    // AES-256-GCM ciphertext of the credential payload (shape depends on
    // authType — { key }, { token }, { username, password }, etc.).
    encrypted: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },

    // Last 4 characters of the primary secret, stored in plaintext purely
    // for display ("••••••••4a2f") so an admin can tell which key is saved
    // without ever re-decrypting it for the UI.
    last4: { type: String, default: "" },

    // Present only when authType === "oauth2" — refresh token encrypted
    // the same way; access tokens are never persisted, only cached
    // in-memory for the process lifetime.
    oauth: {
      refreshTokenEncrypted: { type: String, default: "" },
      refreshTokenIv: { type: String, default: "" },
      refreshTokenAuthTag: { type: String, default: "" },
      accessTokenExpiresAt: { type: Date, default: null },
      scope: { type: String, default: "" },
    },

    rotatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.ConnectorCredential || mongoose.model("ConnectorCredential", ConnectorCredentialSchema);
