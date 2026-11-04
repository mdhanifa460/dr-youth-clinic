// NMC's October 2026 advertising guidelines are reported to bar advertising the
// number of patients treated. Figures like this also live in admin-edited data,
// which can be re-added at any time, so components filter at render time rather
// than relying on the saved content staying clean.
const PATIENT_COUNT_LABEL = /patient|client|customer|lives|successful|treatments?\s*(done|completed)|transformations/i;

export function withoutPatientCounts<T extends { label?: string }>(stats: T[] | undefined | null): T[] {
  return (stats ?? []).filter((s) => !PATIENT_COUNT_LABEL.test(s?.label ?? ''));
}

const PATIENT_COUNT_TEXT = /\d[\d,.]*\s*k?\+?\s*(happy |satisfied )?(patients?|clients?)/i;

export function mentionsPatientCount(text: string | undefined | null): boolean {
  return PATIENT_COUNT_TEXT.test(text ?? '');
}
