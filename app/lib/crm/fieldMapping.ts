import { normalizePhone } from "@/app/lib/phone";

// Named, pure transforms — a mapping's `transform` field is a key into this
// registry, never inline code, so a new transform is additive and never a
// reason to touch a connector implementation. Kept small on purpose: only
// what Phase 1's push targets (leads, bookings) actually need.
export const TRANSFORM_REGISTRY: Record<string, (value: unknown) => unknown> = {
  "phone.normalize": (value) => normalizePhone(String(value ?? "")),
  "string.upper": (value) => String(value ?? "").toUpperCase(),
  "string.trim": (value) => String(value ?? "").trim(),
};

// Combines two platform fields (e.g. separate date/time strings) into one
// ISO 8601 timestamp — the one transform that reads two source fields
// instead of one, so it's applied separately rather than through the
// single-value registry above.
export function combineDateTimeIso(date: string, time: string): string {
  if (!date) return "";
  const parsed = time ? new Date(`${date} ${time}`) : new Date(date);
  return isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

export interface MappingFieldDef {
  platformField: string;
  externalField: string;
  transform?: string;
  required?: boolean;
}

export interface MappingResult {
  mapped: Record<string, unknown>;
  missingRequired: string[];
}

// Applies a saved ConnectorFieldMapping to an object, translating between
// our platform shape and the CRM's external shape. `direction` picks which
// side is the source: "push" reads platformField -> writes externalField
// (website sending to the CRM); "pull" reads externalField -> writes
// platformField (CRM response coming into the platform). Never produces a
// partial record silently — a mapping that can't satisfy a `required`
// field reports it in `missingRequired` so the caller fails fast with a
// specific error instead of a vague "CRM rejected the request."
export function applyFieldMapping(
  source: Record<string, unknown>,
  fields: MappingFieldDef[],
  direction: "push" | "pull" = "push"
): MappingResult {
  const mapped: Record<string, unknown> = {};
  const missingRequired: string[] = [];
  const readKey = direction === "push" ? "platformField" : "externalField";
  const writeKey = direction === "push" ? "externalField" : "platformField";

  for (const field of fields) {
    const raw = source[field[readKey]];
    const rawEmpty = raw === undefined || raw === null || raw === "";
    if (rawEmpty && field.required) {
      missingRequired.push(field[readKey]);
    }

    let value = raw;
    if (field.transform && !rawEmpty) {
      const fn = TRANSFORM_REGISTRY[field.transform];
      if (fn) value = fn(value);
    }
    if (value !== undefined) mapped[field[writeKey]] = value;
  }

  return { mapped, missingRequired };
}
