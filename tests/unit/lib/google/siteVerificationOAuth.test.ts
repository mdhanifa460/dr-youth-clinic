import { describe, it, expect } from 'vitest';
import {
  createOAuth2Client,
  buildAuthorizationUrl,
  signState,
  verifyState,
  redactCredentialForClient,
  completeAuthorization,
  SITE_VERIFICATION_SCOPE,
} from '@/app/lib/google/siteVerificationOAuth';

const FAKE_CONFIG = {
  clientId: 'fake-client-id.apps.googleusercontent.com',
  clientSecret: 'fake-client-secret',
  redirectUri: 'https://dryouthclinics.com/api/admin/google-site-verification/callback',
};

describe('buildAuthorizationUrl', () => {
  const client = createOAuth2Client(FAKE_CONFIG);
  const url = new URL(buildAuthorizationUrl(client, 'test-state-value'));

  it('points at Google’s real OAuth endpoint', () => {
    expect(url.origin).toBe('https://accounts.google.com');
  });

  it('requests exactly the Site Verification scope — nothing broader', () => {
    const scope = url.searchParams.get('scope');
    expect(scope).toBe(SITE_VERIFICATION_SCOPE);
  });

  it('never requests Gmail, Drive, Analytics, Cloud Platform, or userinfo scopes', () => {
    const scope = url.searchParams.get('scope') || '';
    for (const forbidden of ['gmail', 'drive', 'analytics', 'cloud-platform', 'bigquery', 'userinfo']) {
      expect(scope.toLowerCase()).not.toContain(forbidden);
    }
  });

  it('requests offline access and forces the consent prompt (so a refresh token is always returned)', () => {
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
  });

  it('carries the exact state value through unmodified', () => {
    expect(url.searchParams.get('state')).toBe('test-state-value');
  });

  it('uses the configured client ID and redirect URI, not a hardcoded value', () => {
    expect(url.searchParams.get('client_id')).toBe(FAKE_CONFIG.clientId);
    expect(url.searchParams.get('redirect_uri')).toBe(FAKE_CONFIG.redirectUri);
  });
});

describe('signState / verifyState', () => {
  const secret = 'test-secret-not-real';

  it('round-trips a fresh state as valid', () => {
    const now = Date.now();
    const state = signState('nonce-abc', now, secret);
    const result = verifyState(state, secret, now + 1000);
    expect(result.valid).toBe(true);
    expect(result.nonce).toBe('nonce-abc');
  });

  it('rejects a state signed with a different secret', () => {
    const now = Date.now();
    const state = signState('nonce-abc', now, 'other-secret');
    const result = verifyState(state, secret, now);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('bad_signature');
  });

  it('rejects a tampered nonce even if the signature format looks right', () => {
    const now = Date.now();
    const state = signState('nonce-abc', now, secret);
    const tampered = state.replace('nonce-abc', 'nonce-xyz');
    const result = verifyState(tampered, secret, now);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('bad_signature');
  });

  it('rejects an expired state', () => {
    const issuedAt = Date.now() - 20 * 60 * 1000; // 20 minutes ago
    const state = signState('nonce-abc', issuedAt, secret);
    const result = verifyState(state, secret, Date.now(), 10 * 60 * 1000);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('expired');
  });

  it('rejects a malformed state value', () => {
    expect(verifyState('not-a-real-state', secret, Date.now()).valid).toBe(false);
    expect(verifyState('', secret, Date.now()).valid).toBe(false);
  });
});

describe('completeAuthorization — env misconfiguration', () => {
  it('rejects clearly when GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI are not set, before any network call', async () => {
    const saved = {
      id: process.env.GOOGLE_CLIENT_ID,
      secret: process.env.GOOGLE_CLIENT_SECRET,
      uri: process.env.GOOGLE_REDIRECT_URI,
    };
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;

    await expect(completeAuthorization('fake-code', { _id: 'x', email: 'admin@example.com' })).rejects.toThrow(
      /GOOGLE_CLIENT_ID|GOOGLE_CLIENT_SECRET|GOOGLE_REDIRECT_URI/
    );

    if (saved.id) process.env.GOOGLE_CLIENT_ID = saved.id;
    if (saved.secret) process.env.GOOGLE_CLIENT_SECRET = saved.secret;
    if (saved.uri) process.env.GOOGLE_REDIRECT_URI = saved.uri;
  });
});

describe('redactCredentialForClient — non-disclosure', () => {
  it('reports not connected when nothing is stored', () => {
    const result = redactCredentialForClient(null);
    expect(result.connected).toBe(false);
    expect(result.last4).toBe('');
    expect(Object.keys(result)).not.toContain('refreshToken');
    expect(Object.keys(result)).not.toContain('accessToken');
  });

  it('reports connected with only safe, redacted fields — never the encrypted payload itself', () => {
    const result = redactCredentialForClient({
      encryptedRefreshToken: { encrypted: 'SHOULD-NEVER-APPEAR', iv: 'x', authTag: 'y' },
      scope: SITE_VERIFICATION_SCOPE,
      refreshTokenLast4: '9f2a',
      connectedAt: new Date('2026-01-01T00:00:00Z'),
      connectedByEmail: 'admin@example.com',
      revokedAt: null,
    });
    expect(result.connected).toBe(true);
    expect(result.last4).toBe('9f2a');
    expect(result.scope).toBe(SITE_VERIFICATION_SCOPE);
    // The whole point of this function — assert its output never contains
    // the raw encrypted payload or any token-shaped value.
    expect(JSON.stringify(result)).not.toContain('SHOULD-NEVER-APPEAR');
    expect(JSON.stringify(result)).not.toMatch(/refresh_token|access_token|encryptedRefreshToken/i);
  });

  it('reports not connected once revoked, even if a stale encrypted payload is still present', () => {
    const result = redactCredentialForClient({
      encryptedRefreshToken: { encrypted: 'stale', iv: 'x', authTag: 'y' },
      revokedAt: new Date(),
    });
    expect(result.connected).toBe(false);
  });
});
