// Single source of truth for the Custom Analytics Event enums
// (triggerType / parameter source). Both the Mongoose schema
// (app/models/CustomAnalyticsEvent.ts) and every admin <select> must
// import from here rather than hand-typing the same string array twice —
// that exact drift (a value added to one but not the other) is what
// caused Banner.templateType's enum bug earlier this session, and is the
// same discipline app/lib/banners/popupOptions.ts already follows.

// Phase 1 shipped page_view/button_click/cta_click/element_visible — the
// trigger types that don't need per-element disambiguation logic.
// Phase 2 adds form_start/form_submit, using the SAME elementId field
// (holding the <form>'s own id attribute, not a button's) since a form is
// just another single element to match by exact id — no new field needed.
// form_submit listens for the browser's native `submit` event, which is
// never dispatched at all when native HTML5 validation blocks the
// attempt (required fields, etc.) — that's the browser's own behavior,
// not something this code has to detect itself, and correctly excludes
// validation-blocked attempts for any form using standard HTML5
// validation. A form with fully custom JS validation that intercepts a
// button click instead of a real submit is a known, documented edge case
// this trigger type won't catch — use cta_click on that button instead.
export const CUSTOM_EVENT_TRIGGER_TYPES = [
  "page_view",
  "button_click",
  "cta_click",
  "element_visible",
  "form_start",
  "form_submit",
] as const;
export type CustomEventTriggerType = (typeof CUSTOM_EVENT_TRIGGER_TYPES)[number];

export const CUSTOM_EVENT_TRIGGER_TYPE_LABELS: Record<CustomEventTriggerType, string> = {
  page_view: "Page View",
  button_click: "Button Click",
  cta_click: "CTA Click",
  element_visible: "Element Visible",
  form_start: "Form Start",
  form_submit: "Form Submit",
};

// button_click and cta_click behave identically (both are exact-id click
// matches, see CustomEventListener.tsx) — kept as two separate trigger
// options because that's how marketing actually thinks about them ("this
// is a CTA" vs "this is just a button"), not because the underlying
// mechanism differs.
export const CUSTOM_EVENT_TRIGGER_TYPES_NEEDING_ELEMENT_ID: CustomEventTriggerType[] = [
  "button_click",
  "cta_click",
  "element_visible",
  "form_start",
  "form_submit",
];

export const CUSTOM_EVENT_PARAM_SOURCES = ["static", "dataAttribute"] as const;
export type CustomEventParamSource = (typeof CUSTOM_EVENT_PARAM_SOURCES)[number];

export const CUSTOM_EVENT_PARAM_SOURCE_LABELS: Record<CustomEventParamSource, string> = {
  static: "Fixed value",
  dataAttribute: "Read from element's data-* attribute",
};
