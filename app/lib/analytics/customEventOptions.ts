// Single source of truth for the Custom Analytics Event enums
// (triggerType / parameter source). Both the Mongoose schema
// (app/models/CustomAnalyticsEvent.ts) and every admin <select> must
// import from here rather than hand-typing the same string array twice —
// that exact drift (a value added to one but not the other) is what
// caused Banner.templateType's enum bug earlier this session, and is the
// same discipline app/lib/banners/popupOptions.ts already follows.

// Phase 1 subset only — page_view/button_click/cta_click/element_visible
// are the trigger types that don't need per-element disambiguation logic.
// form_start/form_submit are deferred (see the plan's Phase 2 notes: they
// need to identify WHICH form on a page, first-input vs. real-submit vs.
// validation-blocked-attempt semantics — none of which the simpler
// triggers below have to solve).
export const CUSTOM_EVENT_TRIGGER_TYPES = [
  "page_view",
  "button_click",
  "cta_click",
  "element_visible",
] as const;
export type CustomEventTriggerType = (typeof CUSTOM_EVENT_TRIGGER_TYPES)[number];

export const CUSTOM_EVENT_TRIGGER_TYPE_LABELS: Record<CustomEventTriggerType, string> = {
  page_view: "Page View",
  button_click: "Button Click",
  cta_click: "CTA Click",
  element_visible: "Element Visible",
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
];

export const CUSTOM_EVENT_PARAM_SOURCES = ["static", "dataAttribute"] as const;
export type CustomEventParamSource = (typeof CUSTOM_EVENT_PARAM_SOURCES)[number];

export const CUSTOM_EVENT_PARAM_SOURCE_LABELS: Record<CustomEventParamSource, string> = {
  static: "Fixed value",
  dataAttribute: "Read from element's data-* attribute",
};
