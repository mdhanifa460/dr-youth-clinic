import { describe, it, expect } from 'vitest';
import {
  base32Encode,
  base32Decode,
  decryptTotpSecret,
  encryptTotpSecret,
  generateBackupCodes,
  hashBackupCode,
  matchTotpStep,
  totpForStep,
} from '@/app/lib/twoFactor';

// The RFC 6238 test key, whose published 8-digit codes end in these 6 digits.
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

describe('totp', () => {
  it('matches the RFC 6238 test vectors', () => {
    expect(totpForStep(RFC_SECRET, 1)).toBe('287082');
    expect(totpForStep(RFC_SECRET, Math.floor(1111111109 / 30))).toBe('081804');
  });

  it('accepts the current code and one step either side', () => {
    const now = 1_700_000_000_000;
    const step = Math.floor(now / 1000 / 30);
    expect(matchTotpStep(RFC_SECRET, totpForStep(RFC_SECRET, step), now)).toBe(step);
    expect(matchTotpStep(RFC_SECRET, totpForStep(RFC_SECRET, step - 1), now)).toBe(step - 1);
    expect(matchTotpStep(RFC_SECRET, totpForStep(RFC_SECRET, step + 1), now)).toBe(step + 1);
  });

  it('rejects an old code and malformed input', () => {
    const now = 1_700_000_000_000;
    const step = Math.floor(now / 1000 / 30);
    expect(matchTotpStep(RFC_SECRET, totpForStep(RFC_SECRET, step - 5), now)).toBeNull();
    expect(matchTotpStep(RFC_SECRET, '12345', now)).toBeNull();
    expect(matchTotpStep(RFC_SECRET, 'abcdef', now)).toBeNull();
  });

  it('round-trips base32', () => {
    expect(base32Decode(RFC_SECRET).toString()).toBe('12345678901234567890');
  });
});

describe('secret encryption', () => {
  it('round-trips with the right passphrase', () => {
    expect(decryptTotpSecret(encryptTotpSecret('ABC', 'one'), 'one')).toBe('ABC');
  });

  it('returns null, not an error, after the passphrase changes', () => {
    expect(decryptTotpSecret(encryptTotpSecret('ABC', 'one'), 'two')).toBeNull();
  });

  it('never stores the secret readably', () => {
    expect(encryptTotpSecret('ABCDEFGH', 'one')).not.toContain('ABCDEFGH');
  });
});

describe('backup codes', () => {
  it('generates distinct codes', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
  });

  it('matches regardless of case and the dash', () => {
    expect(hashBackupCode('abcde-fghij')).toBe(hashBackupCode('ABCDEFGHIJ'));
  });
});
