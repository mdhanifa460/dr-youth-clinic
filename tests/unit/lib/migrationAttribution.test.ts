import { describe, it, expect } from 'vitest';
import {
  extractMigrationParams,
  parseMigrationCookie,
  resolveOriginDomain,
  MIGRATION_FIRST_COOKIE,
} from '@/app/lib/migrationAttribution';

describe('extractMigrationParams', () => {
  it('extracts migration_source and migration_from', () => {
    const params = new URLSearchParams('migration_source=old_domain&migration_from=dryouthclinic.co.in');
    expect(extractMigrationParams(params)).toEqual({ source: 'old_domain', from: 'dryouthclinic.co.in' });
  });

  it('returns null when migration_source is absent — the overwhelming majority of requests', () => {
    const params = new URLSearchParams('utm_source=google&utm_medium=cpc');
    expect(extractMigrationParams(params)).toBeNull();
  });

  it('defaults migration_from to empty string when only migration_source is present', () => {
    const params = new URLSearchParams('migration_source=old_domain');
    expect(extractMigrationParams(params)).toEqual({ source: 'old_domain', from: '' });
  });

  it('never reads utm_source as a migration marker — the two are fully independent', () => {
    const params = new URLSearchParams('utm_source=old_domain&utm_medium=redirect');
    expect(extractMigrationParams(params)).toBeNull();
  });

  it('truncates absurdly long values', () => {
    const params = new URLSearchParams(`migration_source=${'x'.repeat(500)}`);
    expect(extractMigrationParams(params)!.source.length).toBe(100);
  });
});

describe('parseMigrationCookie', () => {
  it('parses a valid JSON cookie', () => {
    const raw = JSON.stringify({ source: 'old_domain', from: 'dryouthclinic.co.in', landingPage: '/hair-transplant' });
    expect(parseMigrationCookie(raw)).toEqual({ source: 'old_domain', from: 'dryouthclinic.co.in', landingPage: '/hair-transplant' });
  });

  it('returns null for missing/empty input', () => {
    expect(parseMigrationCookie(undefined)).toBeNull();
    expect(parseMigrationCookie(null)).toBeNull();
    expect(parseMigrationCookie('')).toBeNull();
  });

  it('returns null for malformed JSON rather than throwing', () => {
    expect(parseMigrationCookie('{not json')).toBeNull();
  });

  it('rejects an object with no source field', () => {
    expect(parseMigrationCookie(JSON.stringify({ from: 'dryouthclinic.co.in' }))).toBeNull();
  });
});

describe('resolveOriginDomain', () => {
  it('resolves "old" when the migration_first cookie carries source old_domain', () => {
    const cookies = new Map([[MIGRATION_FIRST_COOKIE, JSON.stringify({ source: 'old_domain', from: 'dryouthclinic.co.in' })]]);
    expect(resolveOriginDomain((name) => cookies.get(name))).toBe('old');
  });

  it('resolves "new" when no migration cookie is present', () => {
    expect(resolveOriginDomain(() => undefined)).toBe('new');
  });

  it('resolves "new" for a garbled cookie rather than throwing', () => {
    const cookies = new Map([[MIGRATION_FIRST_COOKIE, 'not json']]);
    expect(resolveOriginDomain((name) => cookies.get(name))).toBe('new');
  });

  it('resolves "new" if the cookie source is something other than old_domain', () => {
    const cookies = new Map([[MIGRATION_FIRST_COOKIE, JSON.stringify({ source: 'something_else' })]]);
    expect(resolveOriginDomain((name) => cookies.get(name))).toBe('new');
  });
});
