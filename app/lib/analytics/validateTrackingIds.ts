// Format validation for the Analytics & Tracking admin page's manually-
// entered public IDs (GTM/GA4/Meta Pixel/Clarity/Hotjar). None of these are
// secrets — they're all safe to expose to the browser (they already are,
// once saved, via app/lib/analyticsConfig.ts → app/layout.tsx) — but a
// malformed value would previously be persisted as-is and interpolated
// straight into the GTM script tag. An empty string is always valid: it
// means "not configured," which every one of these fields already treats
// as its default/off state.
export interface TrackingIdValidation {
  valid: boolean;
  trimmed: string;
  error?: string;
}

function validate(raw: string, pattern: RegExp, label: string, example: string): TrackingIdValidation {
  const trimmed = (raw ?? '').trim();
  if (trimmed === '') return { valid: true, trimmed: '' };
  if (!pattern.test(trimmed)) {
    return { valid: false, trimmed, error: `${label} looks invalid — expected a format like "${example}".` };
  }
  return { valid: true, trimmed };
}

// GTM-XXXXXXX — always starts "GTM-", then uppercase alphanumerics.
export function validateGtmId(raw: string): TrackingIdValidation {
  return validate(raw, /^GTM-[A-Z0-9]+$/, 'GTM Container ID', 'GTM-NX462ZPQ');
}

// G-XXXXXXXXXX — GA4 measurement IDs always start "G-".
export function validateGa4Id(raw: string): TrackingIdValidation {
  return validate(raw, /^G-[A-Z0-9]+$/, 'GA4 Measurement ID', 'G-0K4NNXXBND');
}

// Meta Pixel IDs are plain numeric strings, typically 15-16 digits.
export function validateMetaPixelId(raw: string): TrackingIdValidation {
  return validate(raw, /^\d{10,20}$/, 'Meta Pixel ID', '123456789012345');
}

// Microsoft Clarity project IDs are short lowercase alphanumeric strings.
export function validateClarityId(raw: string): TrackingIdValidation {
  return validate(raw, /^[a-z0-9]{6,15}$/i, 'Clarity Project ID', 'abcd1234ef');
}

// Hotjar Site IDs are plain numeric strings.
export function validateHotjarId(raw: string): TrackingIdValidation {
  return validate(raw, /^\d{5,10}$/, 'Hotjar Site ID', '1234567');
}

export const TRACKING_ID_VALIDATORS = {
  gtmId: validateGtmId,
  ga4Id: validateGa4Id,
  metaPixelId: validateMetaPixelId,
  clarityId: validateClarityId,
  hotjarId: validateHotjarId,
} as const;

export type TrackingIdField = keyof typeof TRACKING_ID_VALIDATORS;

// Runs every field present in `values` through its validator. Returns the
// trimmed values (safe to persist) plus any errors keyed by field — reused
// identically by both the client-side form (immediate feedback) and the
// server-side route (defense in depth), so the two can never disagree about
// what's valid.
export function validateTrackingIds(
  values: Partial<Record<TrackingIdField, string>>
): { trimmed: Partial<Record<TrackingIdField, string>>; errors: Partial<Record<TrackingIdField, string>> } {
  const trimmed: Partial<Record<TrackingIdField, string>> = {};
  const errors: Partial<Record<TrackingIdField, string>> = {};

  for (const field of Object.keys(values) as TrackingIdField[]) {
    const raw = values[field];
    if (raw === undefined) continue;
    const result = TRACKING_ID_VALIDATORS[field](raw);
    trimmed[field] = result.trimmed;
    if (!result.valid && result.error) errors[field] = result.error;
  }

  return { trimmed, errors };
}
