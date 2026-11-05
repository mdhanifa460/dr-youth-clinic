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

const LIVE_STAT_LABEL = /clinic|location|branch|cit(?:y|ies)|doctor|specialist|surgeon|treatment|service|procedure/i;

// Clinic, doctor and treatment figures are always counted from live data, so a typed-in
// "20+ doctors" can't contradict the page. A count of zero is left out rather than shown.
export function withLiveStats<T extends { label?: string; value?: unknown }>(saved: T[], live: { label: string; value: number }[]) {
  return [
    ...saved.filter((s) => !LIVE_STAT_LABEL.test(s?.label ?? '')),
    ...live.filter((s) => s.value > 0).map((s) => ({ label: s.label, value: String(s.value) })),
  ];
}

const YEARS_IN_TEXT = /\b\d+(?:\.\d+)?(?:\s*\+)?(?=\s*(?:years?|yrs?)['’]?\s+(?:of\s+)?(?:experience|expertise))/i;

// Same as withClinicYears, for clinic-wide copy like "20+ years experience".
export function withClinicYearsText(text: string | undefined): string | undefined {
  return text?.replace(YEARS_IN_TEXT, CLINIC_YEARS);
}

// Copy typed into Admin outlives any code clean-up, so these run at render time
// too. Nothing here can be supported yet: no device evidence or accreditation is
// on file, and the qualifications listed for the clinic's doctors don't include a
// dermatology degree. If that changes, narrow the patterns rather than re-adding copy.
const UNSUPPORTED_CLAIM =
  /\b(?:US\s+)?FDA\b|\bNABH\b|\bIADVL\b|\bISO\s*(?:9001|certified|compliant)|\bbest\s+(?:aesthetic|skin|hair|derm|clinic|doctor|cosmetic)|(?:#|\bno\.?\s*)1\b|\bnumber one\b|\bcontentment\b|\bpainless\b|\bguarantee[ds]?\b|\bproven\b|\bthousands of\b|\btrusted by thousands\b|\b(?:lasting|long-lasting|permanent)\s+results\b|\breal\s+results\b|\bflawless\b|\bzero\s+downtime\b|\blimited[-\s]time\b|\bup to \d+\s*%|\b\d[\d,.]*\s*k\+?\s*(?:successful|procedures|subscribers)/i;

export function hasUnsupportedClaim(text: string | undefined | null): boolean {
  const withoutDisclaimers = (text ?? '').replace(/\b(?:no|not|never|cannot|can't)\b[^.]{0,40}\bguarantee[ds]?\b/gi, '');
  return UNSUPPORTED_CLAIM.test(withoutDisclaimers);
}

// Rewrites credential wording that has a safe equivalent, so a sentence survives
// instead of being dropped: "our expert dermatologists" -> "our doctors".
export function cleanCredentialWording(text: string): string {
  return text
    .replace(/,?\s*[^,.]*\bbest\s+aesthetic\s+clinics?\b[^.]*/gi, '')
    .replace(/\b(?:board[-\s]certified|certified|MD|expert|experienced|trained)\s+(?=dermatologists?\b)/gi, '')
    .replace(/\bdermatologists?\s+or\s+aesthetic\s+physicians?\b/gi, 'doctor')
    .replace(/\bDermatologists\b/g, 'Doctors')
    .replace(/\bDermatologist\b/g, 'Doctor')
    .replace(/\bdermatologists\b/g, 'doctors')
    .replace(/\bdermatologist\b/g, 'doctor')
    .replace(/\bBoard[-\s]certified\s+(\w)/g, (_, c: string) => c.toUpperCase())
    .replace(/\bboard[-\s]certified\s+/g, '');
}

// Doctor profiles stay in place whatever they say, so only the wording changes.
export function scrubDoctorBios<T extends { bio?: string }>(doctors: T[]): T[] {
  return doctors.map((d) => (d.bio ? { ...d, bio: cleanCredentialWording(d.bio) } : d));
}

const CREDENTIAL_QUESTION = /certified\s+dermatolog|are your doctors.*dermatolog/i;
const NON_COPY_KEY = /^(?:_?id|url|href|ctaHref|viewAllHref|publicId|slug|icon|image|photo|type|key|accentBg|bgColor|color|sectionKey)$/i;
const looksLikeLink = (s: string) => /^(?:https?:|tel:|mailto:|\/|#)/.test(s);

const copyFields = (item: Record<string, unknown>) =>
  Object.entries(item).filter(([k, v]) => typeof v === 'string' && !NON_COPY_KEY.test(k) && !looksLikeLink(v)) as [string, string][];

// Small items (a FAQ, an award, a reason) stand or fall on one claim. Larger ones,
// like a hero slide, keep their other fields and just lose the offending one.
const isDroppable = (item: Record<string, unknown>) => {
  const fields = copyFields(item);
  return fields.length <= 3 && fields.some(([, v]) => hasUnsupportedClaim(v) || CREDENTIAL_QUESTION.test(v));
};

// Treatment pages are long articles, so one claim shouldn't cost a whole field. This
// list is narrower than UNSUPPORTED_CLAIM on purpose: honest lines like "real results
// from QR678 take a few months" or "cannot guarantee" read fine and stay.
const TREATMENT_CLAIM = /\b(?:US\s+)?FDA\b|\bNABH\b|\bIADVL\b|\bpainless\b|\breal\s+results?\s+(?:shown|from\s+(?:real|actual|past))/i;
const TREATMENT_KEEP_KEY = /^(?:name|category|location|targetLocations|status|urlSlug|currency)$/;

// Works on text between tags only, so saved HTML stays balanced.
const dropClaimSentences = (text: string) =>
  text
    .split(/(<[^>]+>)/)
    .map((part, i) => (i % 2 || !TREATMENT_CLAIM.test(part) ? part : part.split(/(?<=[.!?])\s+/).filter((s) => !TREATMENT_CLAIM.test(s)).join(' ')))
    .join('');

const lostAField = (before: Record<string, unknown>, after: Record<string, unknown>) => {
  const fields = copyFields(before);
  return fields.length <= 3 && fields.some(([k, v]) => v.trim() && !String(after[k] ?? '').replace(/<[^>]+>/g, '').trim());
};

// Removes only the sentence making the claim. A short item left without one of its
// fields (a benefit with no title, a FAQ with no answer) is dropped entirely, and so is
// a list string with nothing left. Links, ids and image fields are never touched.
export function scrubTreatmentClaims<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.flatMap((v) => {
      const clean = scrubTreatmentClaims(v);
      if (typeof v === 'string') return v.trim() && !(clean as string).trim() ? [] : [clean];
      const isPlain = v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype;
      return isPlain && lostAField(v as Record<string, unknown>, clean as Record<string, unknown>) ? [] : [clean];
    }) as unknown as T;
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => {
        if (NON_COPY_KEY.test(k) || TREATMENT_KEEP_KEY.test(k)) return [k, v];
        return [k, typeof v === 'string' ? (looksLikeLink(v) ? v : dropClaimSentences(v)) : scrubTreatmentClaims(v)];
      })
    ) as T;
  }
  return typeof value === 'string' ? (dropClaimSentences(value) as unknown as T) : value;
}

// Walks saved content. A list item making a claim is dropped; a single field is
// removed so the component's own default takes over; everything else has its
// credential wording cleaned. Links, ids and image fields are never touched.
export function scrubClaims<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((v) => (typeof v === 'string' ? !hasUnsupportedClaim(v) : !(v && typeof v === 'object' && isDroppable(v as Record<string, unknown>))))
      .map(scrubClaims) as unknown as T;
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === 'string' && !NON_COPY_KEY.test(k) && !looksLikeLink(v)) {
        if (!hasUnsupportedClaim(v)) out[k] = cleanCredentialWording(v);
      } else {
        out[k] = NON_COPY_KEY.test(k) ? v : scrubClaims(v);
      }
    }
    return out as T;
  }
  return value;
}
