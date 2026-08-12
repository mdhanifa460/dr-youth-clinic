// `$set: body` on a top-level key whose value is itself an object REPLACES
// that whole sub-object — it doesn't merge. A caller that sends a partial
// section (e.g. { analytics: { searchConsoleId: "x" } }, meaning only to
// change one field) silently wipes out every sibling field already in that
// section (gtmId, clarityId, etc.) — confirmed as a real incident against
// production, not a hypothetical.
//
// Merges one level deep for any top-level key that's a plain object in
// both the incoming body and the existing document, so a partial section
// update only touches the fields it actually names. Arrays and non-object
// values still replace outright (unchanged from before) — this only closes
// the specific failure mode that actually bit us.
export function mergeSettingsUpdate(
  existing: Record<string, any> | null,
  body: Record<string, any>
): Record<string, any> {
  const isPlainObject = (v: unknown): v is Record<string, any> =>
    !!v && typeof v === 'object' && !Array.isArray(v);

  const merged: Record<string, any> = { ...body };
  for (const key of Object.keys(body)) {
    const incoming = body[key];
    const current = existing?.[key];
    if (isPlainObject(incoming) && isPlainObject(current)) {
      merged[key] = { ...current, ...incoming };
    }
  }
  return merged;
}
