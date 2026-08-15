// PII enforcement for admin-entered Custom Event parameter names — every
// existing predefined event call site already follows a strict "ids,
// categories, sources only, never name/phone/email" convention (see the
// code comments in app/(public)/skin-quiz/page.tsx,
// app/(public)/plan-my-journey/PlanMyJourneyClient.tsx,
// app/models/InterestEvent.ts, app/models/AssessmentEvent.ts), but it's
// only ever been developer discipline, never code-enforced. Custom Events
// are the first place admin-entered (not developer-reviewed) parameter
// names flow into analytics, so this is the first place that discipline
// needs to become an actual, code-level check.
//
// Comparison is case- and separator-insensitive (strips spaces/
// underscores/hyphens before comparing) so "Patient_Name", "patient-name",
// and "patientname" are all caught, not just an exact string match.
const PII_BLOCKED_PARAM_NAMES = [
  "name",
  "firstname",
  "lastname",
  "fullname",
  "patientname",
  "phone",
  "phonenumber",
  "mobile",
  "mobilenumber",
  "whatsappnumber",
  "email",
  "emailaddress",
  "address",
  "dob",
  "dateofbirth",
  "medicalhistory",
  "diagnosis",
  "condition",
  "prescription",
  "treatmentnotes",
] as const;

function normalize(name: string): string {
  return name.toLowerCase().replace(/[\s_-]/g, "");
}

export interface PiiValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateParamName(name: string): PiiValidationResult {
  const normalized = normalize(name || "");
  if (!normalized) {
    return { valid: false, reason: "Parameter name is required." };
  }
  if (PII_BLOCKED_PARAM_NAMES.includes(normalized as (typeof PII_BLOCKED_PARAM_NAMES)[number])) {
    return {
      valid: false,
      reason: `"${name}" looks like it could carry personal/medical information and isn't allowed as an analytics parameter. Use an id, category, or source instead (e.g. service, branch, offer_id).`,
    };
  }
  return { valid: true };
}

// Validates every parameter name in one call — used by the Custom Event
// create/update API routes. Returns the first violation found, or null if
// every name is clean.
export function validateParamNames(names: string[]): PiiValidationResult | null {
  for (const name of names) {
    const result = validateParamName(name);
    if (!result.valid) return result;
  }
  return null;
}
