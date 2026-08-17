// Pure logic for the Google Reviews sync — split out of
// app/api/admin/reviews/sync-google/route.ts so the field-mapping,
// change-detection, and error-message logic is unit-testable without
// mocking Mongoose or fetch.

export interface GoogleOwnedFields {
  authorName: string;
  authorAvatar: string;
  rating: number;
  reviewText: string;
  reviewDate: Date;
  meta: {
    authorUrl: string;
    language: string;
    // Not a true per-review permalink — Google's legacy Place Details API
    // doesn't expose one. author_url (the reviewer's own Google Maps
    // profile) is the closest available thing, stored under this name
    // since that's what the admin UI links out to.
    googleMapsUrl: string;
    externalPlaceId: string;
  };
}

// Raw shape of one entry in Google's legacy Place Details `reviews` array.
export interface GooglePlaceReview {
  author_name: string;
  author_url?: string;
  profile_photo_url?: string;
  rating: number;
  text?: string;
  time: number; // unix seconds
  language?: string;
}

export function buildSourceId(gr: GooglePlaceReview): string {
  // Google's legacy Place Details API exposes no stable per-review ID —
  // this composite (author identity + timestamp) is the closest available
  // stable key, and is what the {source, sourceId} unique index dedupes on.
  return `${gr.author_url ?? gr.author_name}_${gr.time}`;
}

export function googleOwnedFields(gr: GooglePlaceReview, placeId: string): GoogleOwnedFields {
  return {
    authorName: gr.author_name || '',
    authorAvatar: gr.profile_photo_url || '',
    rating: gr.rating,
    reviewText: gr.text || '',
    reviewDate: new Date(gr.time * 1000),
    meta: {
      authorUrl: gr.author_url || '',
      language: gr.language || '',
      googleMapsUrl: gr.author_url || '',
      externalPlaceId: placeId || '',
    },
  };
}

// Are two Google-owned field sets actually different? A reviewer can edit
// their review's text/rating on Google after the fact — this tells a
// genuine content change apart from a re-sync that found nothing new, so
// the sync result can report an accurate "unchanged" count instead of
// counting every already-current row as "updated".
export function googleFieldsChanged(
  existing: { authorName: string; authorAvatar: string; rating: number; reviewText: string; reviewDate: Date | string; meta?: { authorUrl?: string; language?: string } },
  incoming: GoogleOwnedFields
): boolean {
  return (
    existing.authorName !== incoming.authorName ||
    existing.authorAvatar !== incoming.authorAvatar ||
    existing.rating !== incoming.rating ||
    existing.reviewText !== incoming.reviewText ||
    new Date(existing.reviewDate).getTime() !== incoming.reviewDate.getTime() ||
    existing.meta?.authorUrl !== incoming.meta.authorUrl ||
    existing.meta?.language !== incoming.meta.language
  );
}

// Maps Google's legacy Places API `status` field to a clear, specific
// admin-facing message — never a raw/opaque status code, and never
// something that could leak the API key (Google's own error_message never
// includes it, but this is deliberately built from a fixed switch rather
// than echoing arbitrary upstream text for the recognized cases).
export function googleStatusMessage(status: string, errorMessage?: string): string {
  switch (status) {
    case 'REQUEST_DENIED':
      return 'Google denied this request — check that GOOGLE_PLACES_API_KEY is valid and the Places API is enabled for it.';
    case 'OVER_QUERY_LIMIT':
      return "Google's API quota or billing limit was reached — check the Places API quota in Google Cloud Console.";
    case 'NOT_FOUND':
      return "GOOGLE_PLACE_ID doesn't match a real Google Business Profile — double-check the Place ID.";
    case 'INVALID_REQUEST':
      return 'The request to Google was malformed — check that GOOGLE_PLACE_ID is set correctly.';
    case 'ZERO_RESULTS':
      return 'Google returned no data for this Place ID.';
    case 'UNKNOWN_ERROR':
      return 'Google had a temporary server error — try syncing again in a moment.';
    default:
      return `Google Places API error: ${status}${errorMessage ? ` — ${errorMessage}` : ''}`;
  }
}

// Cooldown check — pure so the "how many seconds left" math is testable
// without faking Date.now() plumbing through the route.
export function cooldownRemainingMs(lastSyncAt: Date | string | null, cooldownMs: number, now: number = Date.now()): number {
  if (!lastSyncAt) return 0;
  const elapsed = now - new Date(lastSyncAt).getTime();
  return Math.max(0, cooldownMs - elapsed);
}

// Google's own content/identity — only sync-google/route.ts is allowed to
// write these for a source:'google' review. Shared with
// app/api/admin/reviews/[id]/route.ts so both enforce the exact same list.
export const GOOGLE_PROTECTED_FIELDS = ['authorName', 'authorAvatar', 'rating', 'reviewText'] as const;

export function stripGoogleProtectedFields<T extends Record<string, any>>(patch: T): T {
  const stripped = { ...patch };
  for (const key of GOOGLE_PROTECTED_FIELDS) delete stripped[key];
  return stripped;
}
