import { describe, it, expect, beforeAll } from 'vitest';
import { encryptCredential, decryptCredential, last4 } from '@/app/lib/crm/encryption';

beforeAll(() => {
  // 32-byte test key, base64 — never a real key, only used by this suite.
  process.env.CONNECTOR_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
});

describe('encryptCredential / decryptCredential', () => {
  it('round-trips plaintext through encrypt then decrypt', () => {
    const secret = 'fake-crm-apikey-verysecret-12345';
    const payload = encryptCredential(secret);
    expect(payload.encrypted).not.toContain(secret);
    expect(decryptCredential(payload)).toBe(secret);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const a = encryptCredential('same-secret');
    const b = encryptCredential('same-secret');
    expect(a.encrypted).not.toBe(b.encrypted);
    expect(a.iv).not.toBe(b.iv);
  });

  it('fails to decrypt if the auth tag was tampered with', () => {
    const payload = encryptCredential('tamper-test');
    const tampered = { ...payload, authTag: encryptCredential('other').authTag };
    expect(() => decryptCredential(tampered)).toThrow();
  });

  it('throws a clear error when CONNECTOR_ENCRYPTION_KEY is missing', () => {
    const saved = process.env.CONNECTOR_ENCRYPTION_KEY;
    delete process.env.CONNECTOR_ENCRYPTION_KEY;
    expect(() => encryptCredential('x')).toThrow(/CONNECTOR_ENCRYPTION_KEY/);
    process.env.CONNECTOR_ENCRYPTION_KEY = saved;
  });
});

describe('last4', () => {
  it('returns only the last 4 characters', () => {
    expect(last4('fake-key-abcd1234')).toBe('1234');
  });
});
