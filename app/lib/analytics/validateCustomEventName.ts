// Pure event-name validation, extracted so it's testable independent of
// the API route and the Mongoose schema's own `match` validator (which
// only checks format, not collision with the protected predefined
// registry). Used by app/api/admin/analytics/custom-events/route.ts.
import { isPredefinedEventName } from "./eventRegistry";

const NAME_FORMAT = /^[a-z][a-z0-9_]*$/;

export interface NameValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateCustomEventName(name: string): NameValidationResult {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    return { valid: false, reason: "Event name is required." };
  }
  if (!NAME_FORMAT.test(trimmed)) {
    return {
      valid: false,
      reason: "Event name must be lowercase_snake_case — start with a letter, then only lowercase letters, digits, or underscores (e.g. campaign_banner_click).",
    };
  }
  if (isPredefinedEventName(trimmed)) {
    return {
      valid: false,
      reason: `"${trimmed}" is already a predefined event name and can't be reused for a custom event.`,
    };
  }
  return { valid: true };
}
