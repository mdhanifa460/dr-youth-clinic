import { describe, it, expect } from 'vitest';
import { buildOldSiteTarget, oldSiteHostname } from '@/app/lib/domainMigration/oldSiteRedirect';

const C = 'https://dryouthclinics.com';
const build = (oldPathWithQuery: string, mappedNewUrl: string | null = null, oldHost = 'dryouthclinic.co.in') =>
  buildOldSiteTarget({ canonicalSiteUrl: C, oldPathWithQuery, mappedNewUrl, oldHost });
const MARK = 'migration_source=old_domain&migration_from=dryouthclinic.co.in';

describe('oldSiteHostname', () => {
  it('matches the old apex and www, ignoring case and port', () => {
    expect(oldSiteHostname('dryouthclinic.co.in')).toBe('dryouthclinic.co.in');
    expect(oldSiteHostname('WWW.DryouthClinic.co.in:443')).toBe('www.dryouthclinic.co.in');
  });
  it('never matches the new domain, previews or look-alikes', () => {
    for (const h of ['dryouthclinics.com', 'www.dryouthclinics.com', 'x.vercel.app', 'evil-dryouthclinic.co.in', 'dryouthclinic.co.in.evil.com', '', null]) {
      expect(oldSiteHostname(h)).toBeNull();
    }
  });
});

describe('buildOldSiteTarget', () => {
  it('sends a mapped old page to its approved new page, keeping only campaign params', () => {
    expect(build('/Hair-Treatment.aspx?id=4&utm_source=fb&gclid=abc', '/chennai/services/hair/prp'))
      .toBe(`${C}/chennai/services/hair/prp?utm_source=fb&gclid=abc&${MARK}`);
  });
  it('falls back to the same path, keeping the query', () => {
    expect(build('/about?x=1')).toBe(`${C}/about?x=1&${MARK}`);
  });
  it('sends old homepage files to the homepage', () => {
    expect(build('/default.aspx')).toBe(`${C}/?${MARK}`);
    expect(build('/Index.html')).toBe(`${C}/?${MARK}`);
    expect(build('/')).toBe(`${C}/?${MARK}`);
  });
  it('records the old domain without www', () => {
    expect(build('/', null, 'www.dryouthclinic.co.in')).toBe(`${C}/?${MARK}`);
  });
  it('never redirects off the canonical site', () => {
    expect(new URL(build('//evil.example/x')).host).toBe('dryouthclinics.com');
    expect(new URL(build('/x', 'https://evil.example/y')).host).toBe('dryouthclinics.com');
    expect(build('/x', 'https://evil.example/y')).toBe(`${C}/x?${MARK}`);
  });
  it('accepts an absolute mapping on the canonical host', () => {
    expect(build('/old', 'https://dryouthclinics.com/doctors')).toBe(`${C}/doctors?${MARK}`);
  });
});
