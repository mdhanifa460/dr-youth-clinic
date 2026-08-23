// The one generic, controlled vocabulary for "HOW a Lead/Booking
// converted" — deliberately separate from `source` ("WHERE they came
// from", e.g. "google"/"direct"/"justdial", which stays free-text/
// admin-configurable exactly as it always has). Shared by Booking.ts and
// Lead.ts's schemas (both import this instead of each hand-typing their
// own copy of the same enum, per "do not duplicate existing fields"
// applied to new ones too) and by every route that sets it.
//
// "other" is the deliberate escape hatch for a future channel this list
// hasn't been extended for yet — never silently drop/reject a conversion
// just because its channel isn't one of the named five.
export const CONVERSION_CHANNELS = [
  "",               // not yet known / pre-dates this field (see Booking.ts's conversionChannel comment)
  "website",
  "whatsapp",
  "google_lead_form",
  "justdial",
  "indiamart",
  "meta_lead_form",
  "other",
] as const;

export type ConversionChannel = (typeof CONVERSION_CHANNELS)[number];
