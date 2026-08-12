import { describe, it, expect } from 'vitest';
import { mergeSettingsUpdate } from '@/app/lib/settingsMerge';

describe('mergeSettingsUpdate', () => {
  it('reproduces and fixes the real production incident: a partial analytics update no longer wipes sibling fields', () => {
    const existing = {
      analytics: {
        gtmEnabled: true,
        gtmId: 'GTM-N7J5FSVR',
        clarityId: 'xyj9ffwliy',
        searchConsoleId: '',
      },
    };
    // Exactly the request that wiped GTM/Clarity in production — a
    // caller intending to change just one field.
    const body = { analytics: { searchConsoleId: 'abc123' } };

    const result = mergeSettingsUpdate(existing, body);

    expect(result.analytics).toEqual({
      gtmEnabled: true,
      gtmId: 'GTM-N7J5FSVR',
      clarityId: 'xyj9ffwliy',
      searchConsoleId: 'abc123',
    });
  });

  it('a full section update still overwrites every field in that section (no stale leftovers)', () => {
    const existing = { analytics: { gtmId: 'OLD-ID', clarityId: 'old-clarity' } };
    const body = { analytics: { gtmId: 'NEW-ID', clarityId: '' } };

    const result = mergeSettingsUpdate(existing, body);

    expect(result.analytics).toEqual({ gtmId: 'NEW-ID', clarityId: '' });
  });

  it('does not merge across different top-level sections', () => {
    const existing = { analytics: { gtmId: 'GTM-X' }, content: { headline: 'Old' } };
    const body = { content: { headline: 'New' } };

    const result = mergeSettingsUpdate(existing, body);

    expect(result.content).toEqual({ headline: 'New' });
    expect(result.analytics).toBeUndefined(); // untouched section isn't part of this $set at all
  });

  it('replaces arrays outright rather than merging them', () => {
    const existing = { settings: { doctorNoteTemplates: ['a', 'b', 'c'] } };
    const body = { settings: { doctorNoteTemplates: ['x'] } };

    const result = mergeSettingsUpdate(existing, body);

    expect(result.settings.doctorNoteTemplates).toEqual(['x']);
  });

  it('handles a brand-new top-level section with no existing counterpart', () => {
    const existing = { analytics: { gtmId: 'GTM-X' } };
    const body = { newSection: { foo: 'bar' } };

    const result = mergeSettingsUpdate(existing, body);

    expect(result.newSection).toEqual({ foo: 'bar' });
  });

  it('handles a null existing document (first-ever save path)', () => {
    const body = { analytics: { gtmId: 'GTM-X' } };
    const result = mergeSettingsUpdate(null, body);
    expect(result).toEqual(body);
  });
});
