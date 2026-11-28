import { describe, it, expect } from 'vitest';
import {
  canAccessBranch,
  branchCondition,
  scopedBranchFilter,
  assessmentLeadBranch,
  assessmentLeadBranchQuery,
} from '@/app/lib/branchAccess';

const allBranches = { assignedClinics: ['all'] };
const chennaiOnly = { assignedClinics: ['chennai'] };
const noBranches = { assignedClinics: [] as string[] };

describe('canAccessBranch', () => {
  it('lets an all-branches user reach any record, including one with no branch', () => {
    expect(canAccessBranch(allBranches, 'bangalore')).toBe(true);
    expect(canAccessBranch(allBranches, '')).toBe(true);
  });

  it('treats a missing assignedClinics as all branches (the schema default)', () => {
    expect(canAccessBranch({}, 'kochi')).toBe(true);
  });

  it('matches the user\'s own branch however the record spells it', () => {
    expect(canAccessBranch(chennaiOnly, 'chennai')).toBe(true);
    expect(canAccessBranch(chennaiOnly, 'Chennai')).toBe(true);
    expect(canAccessBranch(chennaiOnly, ' Chennai Clinic ')).toBe(true);
  });

  it('refuses other branches', () => {
    expect(canAccessBranch(chennaiOnly, 'bangalore')).toBe(false);
    expect(canAccessBranch(chennaiOnly, 'Bangalore')).toBe(false);
  });

  it('refuses a record with no branch for a branch-restricted user', () => {
    expect(canAccessBranch(chennaiOnly, '')).toBe(false);
    expect(canAccessBranch(chennaiOnly, undefined)).toBe(false);
    expect(canAccessBranch(chennaiOnly, null)).toBe(false);
  });

  it('refuses everything for a user with no branches', () => {
    expect(canAccessBranch(noBranches, 'chennai')).toBe(false);
  });
});

describe('branchCondition', () => {
  it('is null (no filter) for an all-branches user', () => {
    expect(branchCondition(allBranches)).toBeNull();
  });

  it('builds case-insensitive patterns for a restricted user', () => {
    const cond = branchCondition(chennaiOnly)!;
    expect(cond.$in).toHaveLength(1);
    expect(cond.$in[0].test('Chennai Clinic')).toBe(true);
    expect(cond.$in[0].test('bangalore')).toBe(false);
  });

  it('matches nothing for a user with no branches', () => {
    expect(branchCondition(noBranches)).toEqual({ $in: [] });
  });

  it('escapes regex characters in branch names', () => {
    const cond = branchCondition({ assignedClinics: ['a.b'] })!;
    expect(cond.$in[0].test('a.b')).toBe(true);
    expect(cond.$in[0].test('axb')).toBe(false);
  });
});

describe('scopedBranchFilter', () => {
  it('never lets a requested branch replace the restriction', () => {
    expect(scopedBranchFilter(chennaiOnly, 'bangalore')).toBe('forbidden');
  });

  it('allows narrowing to the user\'s own branch', () => {
    const f = scopedBranchFilter(chennaiOnly, 'Chennai');
    expect(f).toBeInstanceOf(RegExp);
    expect((f as RegExp).test('chennai')).toBe(true);
  });

  it('falls back to the user\'s restriction when nothing is requested', () => {
    expect(scopedBranchFilter(chennaiOnly, '')).toEqual(branchCondition(chennaiOnly));
    expect(scopedBranchFilter(allBranches, null)).toBeNull();
  });

  it('lets an all-branches user filter by any branch', () => {
    expect(scopedBranchFilter(allBranches, 'kochi')).toBeInstanceOf(RegExp);
  });
});

describe('assessment lead branch', () => {
  it('prefers the patient\'s own clinic choice, then the QR clinic, then city', () => {
    expect(assessmentLeadBranch({ preferredClinic: 'chennai', clinicLocation: 'kochi', city: 'x' })).toBe('chennai');
    expect(assessmentLeadBranch({ preferredClinic: '', clinicLocation: 'kochi', city: 'x' })).toBe('kochi');
    expect(assessmentLeadBranch({ city: 'Bangalore' })).toBe('Bangalore');
    expect(assessmentLeadBranch(null)).toBe('');
  });

  it('has no query filter for all-branches users', () => {
    expect(assessmentLeadBranchQuery(allBranches)).toBeNull();
  });

  it('filters restricted users on the same field order', () => {
    const q = assessmentLeadBranchQuery(chennaiOnly) as { $or: Record<string, unknown>[] };
    expect(q.$or).toHaveLength(3);
    expect(Object.keys(q.$or[0])).toEqual(['preferredClinic']);
    expect(Object.keys(q.$or[2])).toEqual(['preferredClinic', 'clinicLocation', 'city']);
  });
});
