// Shared Indian phone normalization — strips formatting and ensures a
// consistent "91XXXXXXXXXX" shape, so any two phone numbers collected from
// different forms (booking, lead capture, etc.) can be compared for equality.
export function normalizePhone(phone: string): string {
  let cleaned = (phone || "").replace(/\D/g, "");

  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  if (!cleaned.startsWith("91")) {
    cleaned = "91" + cleaned;
  }

  return cleaned;
}

// The one canonical "is this a real 10-digit Indian mobile number" check —
// every phone field across every public form (booking, leads, landing-page
// leads, AI chat callback request, etc.) should validate through this, not
// its own ad-hoc regex/length check. Before this existed, checks had drifted
// inconsistently: some only enforced "at least 10 digits" (so an 11+ digit
// number silently passed), others allowed 7-20 characters — this is the
// single source of truth going forward.
//
// Accepts an optional leading 0 or country code (91 / +91), which are
// stripped before checking — the input itself only needs to contain a real
// 10-digit mobile number somewhere in a recognizable shape. A real Indian
// mobile number is always exactly 10 digits and starts with 6, 7, 8, or 9
// (landline/other ranges start 0-5 and are deliberately rejected — this
// validator is specifically for a MOBILE number, since every one of these
// forms uses the number for SMS/WhatsApp/call-back, not a landline).
const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;

export function isValidIndianMobile(phone: string): boolean {
  let cleaned = (phone || "").replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
  if (cleaned.startsWith("91") && cleaned.length > 10) cleaned = cleaned.slice(2);
  return INDIAN_MOBILE_RE.test(cleaned);
}

// Shared error copy — every form should show this exact message on an
// invalid number, so the validation rule reads as one consistent product
// decision rather than a different message per page.
export const INVALID_MOBILE_MESSAGE = "Please enter a valid 10-digit mobile number";
