// WhatsApp attribution — the one place a marketing touch has to survive
// leaving this site entirely and landing inside Meta's own app. Shared by
// every WhatsApp CTA (client-side: encodes + appends the token to the
// prefilled message) and the inbound WhatsApp webhook (server-side:
// decodes it back out of the first message received) — same "write here,
// read there" split app/lib/utmAttribution.ts already uses for its
// cookies, just carried inside message text instead of a cookie, since
// nothing else survives the jump to WhatsApp.
//
// IMPORTANT — what this is NOT: Meta's Cloud API has no click-ID mechanism
// for a wa.me-initiated chat (nothing equivalent to Google's gclid). This
// token is entirely our own invention: a short, opaque reference tag
// appended to the message text we ourselves pre-fill. It only works if the
// customer sends the message with the tag intact. A customer who edits or
// deletes it before sending is not attributable — see
// extractAttributionTokenFromMessage's contract below. Never claim
// otherwise, and never guess a campaign back in when the token is
// missing/unparseable.

export interface WaAttributionPayload {
  a?: string;  // attributionId — the existing visitor_id cookie value, reused as-is
  s?: string;  // source
  m?: string;  // medium
  c?: string;  // campaign
  ci?: string; // clickId
  cit?: string; // clickIdType
}

function base64UrlEncode(json: string): string {
  const b64 = typeof window !== 'undefined'
    ? window.btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json, 'utf-8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(token: string): string {
  const b64 = token.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return typeof window !== 'undefined'
    ? decodeURIComponent(escape(window.atob(padded)))
    : Buffer.from(padded, 'base64').toString('utf-8');
}

// Self-describing (carries its own data, not a pointer into a database) —
// deliberately so, per explicit scope: no new MarketingAttribution/lookup
// collection for this phase. Empty string when there's nothing worth
// encoding (a visitor with no attribution data at all), so callers can
// skip appending anything.
export function encodeAttributionToken(payload: WaAttributionPayload): string {
  const compact: WaAttributionPayload = {};
  if (payload.a) compact.a = payload.a;
  if (payload.s) compact.s = payload.s;
  if (payload.m) compact.m = payload.m;
  if (payload.c) compact.c = payload.c;
  if (payload.ci) compact.ci = payload.ci;
  if (payload.cit) compact.cit = payload.cit;
  if (Object.keys(compact).length === 0) return '';
  try {
    return base64UrlEncode(JSON.stringify(compact));
  } catch {
    return '';
  }
}

// Defensive by construction — a token is user-editable text that happened
// to survive in a WhatsApp message, not a trusted internal format. Any
// parse failure (truncated, hand-edited, or simply absent) returns null,
// and every caller treats null as "attribution unavailable," never as a
// reason to guess.
export function decodeAttributionToken(token: string): WaAttributionPayload | null {
  if (!token) return null;
  try {
    const parsed = JSON.parse(base64UrlDecode(token));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

// Looks for "(ref: <token>)" anywhere in an inbound message body. Tolerant
// of the customer having typed something before/after it; NOT tolerant of
// them altering the token itself — an altered token simply fails to
// base64/JSON-decode above and is correctly treated as no attribution.
const REF_PATTERN = /\(ref:\s*([A-Za-z0-9_-]+)\)/;
export function extractAttributionTokenFromMessage(text: string): string | null {
  const match = REF_PATTERN.exec(text || '');
  return match ? match[1] : null;
}

// Builds a wa.me href with the attribution token appended as a trailing,
// clearly-separated line — never mixed into the human-readable greeting
// itself, so the customer's own message still reads naturally.
export function buildWaLink(number: string, message: string, attribution?: WaAttributionPayload): string {
  const digits = (number || '').replace(/\D/g, '');
  if (!digits) return '';
  let text = message;
  const token = attribution ? encodeAttributionToken(attribution) : '';
  if (token) text = `${message}\n\n(ref: ${token})`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
