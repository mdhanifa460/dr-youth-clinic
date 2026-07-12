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
