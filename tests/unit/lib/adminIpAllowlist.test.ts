import { describe, it, expect } from 'vitest';
import { parseAdminAllowlist, isIpAllowed, getRequestIp } from '@/app/lib/adminIpAllowlist';

describe('parseAdminAllowlist', () => {
  it('splits, trims, and drops empty entries', () => {
    expect(parseAdminAllowlist(' 203.0.113.5 , 198.51.100.0/24 ,')).toEqual([
      '203.0.113.5', '198.51.100.0/24',
    ]);
  });

  it('returns an empty array for unset/empty input', () => {
    expect(parseAdminAllowlist(undefined)).toEqual([]);
    expect(parseAdminAllowlist(null)).toEqual([]);
    expect(parseAdminAllowlist('')).toEqual([]);
  });
});

describe('isIpAllowed', () => {
  it('allows everyone when the allowlist is empty — restriction is OFF by default', () => {
    expect(isIpAllowed('1.2.3.4', [])).toBe(true);
    expect(isIpAllowed('unknown', [])).toBe(true);
  });

  it('matches an exact IPv4 address', () => {
    expect(isIpAllowed('203.0.113.5', ['203.0.113.5'])).toBe(true);
    expect(isIpAllowed('203.0.113.6', ['203.0.113.5'])).toBe(false);
  });

  it('matches an IPv4 CIDR range', () => {
    const allowlist = ['198.51.100.0/24'];
    expect(isIpAllowed('198.51.100.1', allowlist)).toBe(true);
    expect(isIpAllowed('198.51.100.254', allowlist)).toBe(true);
    expect(isIpAllowed('198.51.101.1', allowlist)).toBe(false);
  });

  it('matches a /32 CIDR as an exact address', () => {
    expect(isIpAllowed('203.0.113.5', ['203.0.113.5/32'])).toBe(true);
    expect(isIpAllowed('203.0.113.6', ['203.0.113.5/32'])).toBe(false);
  });

  it('matches a /0 CIDR as "allow everything" without special-casing', () => {
    expect(isIpAllowed('9.9.9.9', ['0.0.0.0/0'])).toBe(true);
  });

  it('rejects an unresolvable/unknown client IP once an allowlist is configured', () => {
    expect(isIpAllowed('unknown', ['203.0.113.5'])).toBe(false);
    expect(isIpAllowed('', ['203.0.113.5'])).toBe(false);
  });

  it('ignores a malformed allowlist entry rather than throwing', () => {
    expect(isIpAllowed('203.0.113.5', ['not-an-ip/99', '203.0.113.5'])).toBe(true);
    expect(() => isIpAllowed('203.0.113.5', ['not-an-ip/99'])).not.toThrow();
  });

  it('checks multiple allowlist entries (exact + CIDR mixed)', () => {
    const allowlist = ['203.0.113.5', '198.51.100.0/24'];
    expect(isIpAllowed('203.0.113.5', allowlist)).toBe(true);
    expect(isIpAllowed('198.51.100.9', allowlist)).toBe(true);
    expect(isIpAllowed('8.8.8.8', allowlist)).toBe(false);
  });
});

describe('getRequestIp', () => {
  it('reads the first entry of x-forwarded-for', () => {
    const req = { headers: new Headers({ 'x-forwarded-for': '203.0.113.5, 70.41.3.18, 150.172.238.178' }) };
    expect(getRequestIp(req)).toBe('203.0.113.5');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const req = { headers: new Headers({ 'x-real-ip': '203.0.113.9' }) };
    expect(getRequestIp(req)).toBe('203.0.113.9');
  });

  it('falls back to "unknown" when neither header is present', () => {
    const req = { headers: new Headers() };
    expect(getRequestIp(req)).toBe('unknown');
  });
});
