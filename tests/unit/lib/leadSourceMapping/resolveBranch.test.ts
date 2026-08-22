import { describe, it, expect } from 'vitest';
import { pickBestMapping } from '@/app/lib/leadSourceMapping/resolveBranch';

function mkMapping(overrides: Partial<{
  branch: string; providerAccountId: string; providerPhone: string; whatsappPhoneNumberId: string; active: boolean; updatedAt: string;
}> = {}) {
  return {
    branch: 'chennai',
    providerAccountId: '',
    providerPhone: '',
    whatsappPhoneNumberId: '',
    active: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('pickBestMapping — the multi-branch, multi-listing, multi-number routing decision', () => {
  it('resolves via providerAccountId — the preferred identifier for JustDial/IndiaMART', () => {
    const mappings = [
      mkMapping({ branch: 'chennai', providerAccountId: 'JD-CHN-001' }),
      mkMapping({ branch: 'bangalore', providerAccountId: 'JD-BLR-001' }),
    ];
    const result = pickBestMapping(mappings, { source: 'justdial', providerAccountId: 'JD-BLR-001' });
    expect(result.branch).toBe('bangalore');
    expect(result.matchedOn).toBe('providerAccountId');
  });

  it('falls back to providerPhone when no providerAccountId is present on the incoming payload', () => {
    const mappings = [
      mkMapping({ branch: 'chennai', providerPhone: '+91900000001' }),
      mkMapping({ branch: 'bangalore', providerPhone: '+91900000002' }),
    ];
    const result = pickBestMapping(mappings, { source: 'indiamart', providerPhone: '+91900000002' });
    expect(result.branch).toBe('bangalore');
    expect(result.matchedOn).toBe('providerPhone');
  });

  it('prefers providerAccountId over providerPhone when a mapping row could match either', () => {
    // Two DIFFERENT branches' rows, one matching by account id, the other
    // (wrongly, if phone were checked first) by a phone number that also
    // happens to be present on the incoming payload — proves account id
    // is checked BEFORE phone, not just that it CAN match.
    const mappings = [
      mkMapping({ branch: 'chennai', providerAccountId: 'JD-CHN-001' }),
      mkMapping({ branch: 'bangalore', providerPhone: '+91900000009' }),
    ];
    const result = pickBestMapping(mappings, {
      source: 'justdial', providerAccountId: 'JD-CHN-001', providerPhone: '+91900000009',
    });
    expect(result.branch).toBe('chennai');
    expect(result.matchedOn).toBe('providerAccountId');
  });

  it('resolves WhatsApp by phone_number_id, distinct from the phone-number-based lookups', () => {
    const mappings = [
      mkMapping({ branch: 'chennai', whatsappPhoneNumberId: '100000000000001' }),
      mkMapping({ branch: 'bangalore', whatsappPhoneNumberId: '100000000000002' }),
    ];
    const result = pickBestMapping(mappings, { source: 'whatsapp', whatsappPhoneNumberId: '100000000000002' });
    expect(result.branch).toBe('bangalore');
    expect(result.matchedOn).toBe('whatsappPhoneNumberId');
  });

  it('never matches an inactive mapping, even if its identifier matches exactly', () => {
    const mappings = [mkMapping({ branch: 'chennai', providerAccountId: 'JD-CHN-001', active: false })];
    const result = pickBestMapping(mappings, { source: 'justdial', providerAccountId: 'JD-CHN-001' });
    expect(result.branch).toBeNull();
    expect(result.matchedOn).toBeNull();
  });

  it('returns unresolved (never a guessed default branch) when nothing matches', () => {
    const mappings = [mkMapping({ branch: 'chennai', providerAccountId: 'JD-CHN-001' })];
    const result = pickBestMapping(mappings, { source: 'justdial', providerAccountId: 'JD-UNKNOWN-999' });
    expect(result.branch).toBeNull();
    expect(result.mapping).toBeNull();
  });

  it('when two active mappings somehow share an identifier, the most recently updated one wins', () => {
    const mappings = [
      mkMapping({ branch: 'chennai', providerAccountId: 'JD-DUP', updatedAt: '2026-01-01T00:00:00.000Z' }),
      mkMapping({ branch: 'bangalore', providerAccountId: 'JD-DUP', updatedAt: '2026-06-01T00:00:00.000Z' }),
    ];
    const result = pickBestMapping(mappings, { source: 'justdial', providerAccountId: 'JD-DUP' });
    expect(result.branch).toBe('bangalore');
  });

  it('the exact multi-branch JustDial scenario from the spec: two listings, two branches, no cross-talk', () => {
    const mappings = [
      mkMapping({ branch: 'chennai', providerAccountId: 'Listing-A', providerPhone: 'Phone-A' }),
      mkMapping({ branch: 'bangalore', providerAccountId: 'Listing-B', providerPhone: 'Phone-B' }),
    ];
    expect(pickBestMapping(mappings, { source: 'justdial', providerAccountId: 'Listing-A' }).branch).toBe('chennai');
    expect(pickBestMapping(mappings, { source: 'justdial', providerAccountId: 'Listing-B' }).branch).toBe('bangalore');
  });

  it('the exact multi-branch IndiaMART scenario from the spec: two accounts, two branches', () => {
    const mappings = [
      mkMapping({ branch: 'chennai', providerAccountId: 'Account-A' }),
      mkMapping({ branch: 'bangalore', providerAccountId: 'Account-B' }),
    ];
    expect(pickBestMapping(mappings, { source: 'indiamart', providerAccountId: 'Account-A' }).branch).toBe('chennai');
    expect(pickBestMapping(mappings, { source: 'indiamart', providerAccountId: 'Account-B' }).branch).toBe('bangalore');
  });
});
