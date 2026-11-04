// NMC's October 2026 advertising guidelines are reported to bar advertising the
// number of patients treated, and unverified ratings are hard to defend. Figures
// like these also live in admin-edited data, which can be re-added at any time,
// so components filter at render time rather than trusting saved content.
const PATIENT_CLAIM_LABEL =
  /patient|client|customer|lives|successful|treatments?\s*(done|completed)|transformations|rating|review|satisfaction/i;
const RATING_VALUE = /★|\d\s*\/\s*5\b/;

export function withoutPatientClaims<T extends { label?: string; value?: unknown }>(stats: T[] | undefined | null): T[] {
  return (stats ?? []).filter(
    (s) => !PATIENT_CLAIM_LABEL.test(s?.label ?? '') && !RATING_VALUE.test(String(s?.value ?? ''))
  );
}

const PATIENT_COUNT_TEXT = /\d[\d,.]*\s*k?\+?\s*(happy |satisfied )?(patients?|clients?)/i;

export function mentionsPatientCount(text: string | undefined | null): boolean {
  return PATIENT_COUNT_TEXT.test(text ?? '');
}

// The clinic's one confirmed figure. Individual doctors keep their own.
export const CLINIC_YEARS = '9+';

const YEARS_LABEL = /year|excellence|experience/i;

// Saved pages disagreed (6+, 9+, 10+, 20+), so clinic-wide stat rows always show
// the confirmed figure regardless of what was typed into them.
export function withClinicYears<T extends { label?: string; value?: unknown }>(stats: T[]): T[] {
  return stats.map((s) => (YEARS_LABEL.test(s?.label ?? '') ? ({ ...s, value: CLINIC_YEARS } as T) : s));
}

const YEARS_IN_TEXT = /\b\d+(?:\.\d+)?(?:\s*\+)?(?=\s*(?:years?|yrs?)['’]?\s+(?:of\s+)?(?:experience|expertise))/i;

// Same as withClinicYears, for clinic-wide copy like "20+ years experience".
export function withClinicYearsText(text: string | undefined): string | undefined {
  return text?.replace(YEARS_IN_TEXT, CLINIC_YEARS);
}
