import { describe, it, expect } from 'vitest';
import {
  CUSTOM_EVENT_TRIGGER_TYPES,
  CUSTOM_EVENT_TRIGGER_TYPE_LABELS,
  CUSTOM_EVENT_TRIGGER_TYPES_NEEDING_ELEMENT_ID,
  CUSTOM_EVENT_PARAM_SOURCES,
  CUSTOM_EVENT_PARAM_SOURCE_LABELS,
} from '@/app/lib/analytics/customEventOptions';

// Cheap insurance against the exact enum-lockstep drift that already
// caused a real shipped bug this session (Banner.templateType) — every
// trigger type/param source must have a label, and the Phase 2 form
// triggers must actually be present, not silently dropped.
describe('customEventOptions lockstep completeness', () => {
  it('every trigger type has a label', () => {
    for (const t of CUSTOM_EVENT_TRIGGER_TYPES) {
      expect(CUSTOM_EVENT_TRIGGER_TYPE_LABELS[t]).toBeTruthy();
    }
  });

  it('every param source has a label', () => {
    for (const s of CUSTOM_EVENT_PARAM_SOURCES) {
      expect(CUSTOM_EVENT_PARAM_SOURCE_LABELS[s]).toBeTruthy();
    }
  });

  it('includes the Phase 2 form trigger types', () => {
    expect(CUSTOM_EVENT_TRIGGER_TYPES).toContain('form_start');
    expect(CUSTOM_EVENT_TRIGGER_TYPES).toContain('form_submit');
  });

  it('form triggers require an element (form) id, same as click/visibility triggers', () => {
    expect(CUSTOM_EVENT_TRIGGER_TYPES_NEEDING_ELEMENT_ID).toContain('form_start');
    expect(CUSTOM_EVENT_TRIGGER_TYPES_NEEDING_ELEMENT_ID).toContain('form_submit');
  });

  it('page_view does not require an element id', () => {
    expect(CUSTOM_EVENT_TRIGGER_TYPES_NEEDING_ELEMENT_ID).not.toContain('page_view');
  });
});
