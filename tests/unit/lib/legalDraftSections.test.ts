import { describe, it, expect } from 'vitest';
import { hasUnsupportedClaim } from '@/app/lib/patientClaims';
import { DRAFT_MARKER, isPublishableSection, PRIVACY_DRAFT_SECTIONS } from '@/app/lib/legalDraftSections';

describe('legal draft sections', () => {
  it('keeps any section with an unresolved marker off the public page', () => {
    expect(isPublishableSection({ title: 'Consent', bodyHtml: `<p>${DRAFT_MARKER}: details]</p>` })).toBe(false);
    expect(isPublishableSection({ title: 'Consent', bodyHtml: '<p>Reviewed wording.</p>' })).toBe(true);
  });

  it('ships every draft in an unpublishable state until it is reviewed', () => {
    expect(PRIVACY_DRAFT_SECTIONS).toHaveLength(3);
    for (const section of PRIVACY_DRAFT_SECTIONS) expect(isPublishableSection(section), section.id).toBe(false);
  });

  it('never says consent permits promotional use', () => {
    const photography = PRIVACY_DRAFT_SECTIONS.find((s) => s.id === 'clinical-photography')!.bodyHtml;
    expect(photography).toMatch(/does not give permission for publication/);
    expect(photography).toMatch(/does not by itself make promotional use/);
  });

  it('makes no claim the clinic cannot support', () => {
    for (const section of PRIVACY_DRAFT_SECTIONS) expect(hasUnsupportedClaim(section.bodyHtml), section.id).toBe(false);
  });
});
