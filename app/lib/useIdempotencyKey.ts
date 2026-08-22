import { useRef } from 'react';

// The client half of duplicate-submission protection — see
// app/lib/bookingIdempotency.ts for the server-side contract this key
// feeds into. One shared hook for every human-facing booking form
// (website, landing page, AI chat's booking panel) rather than each
// re-implementing its own key management.
//
// A key is generated lazily, the first time it's asked for, and REUSED
// across a manual retry of the SAME booking intent (so a network timeout
// can be safely retried without creating a duplicate) — but regenerated
// the moment the underlying booking details actually change (so editing
// the form and submitting again correctly counts as a new attempt, not a
// retry of the old one).

export interface IdempotencyKeyState {
  key: string;
  snapshot: string;
}

// Pure — directly unit-testable without React. The hook below is just a
// useRef wrapper around this.
export function computeIdempotencyKey(
  identity: Record<string, unknown>,
  prev: IdempotencyKeyState | null
): IdempotencyKeyState {
  const snapshot = JSON.stringify(identity);
  if (prev && prev.snapshot === snapshot) return prev;
  return { key: crypto.randomUUID(), snapshot };
}

// Returns a function: call it with the current booking-identity fields
// right before each submit attempt, get back the key to send as the
// Idempotency-Key header. Only usable from a client component (every
// form this is wired into already is).
export function useIdempotencyKey() {
  const stateRef = useRef<IdempotencyKeyState | null>(null);
  return (identity: Record<string, unknown>): string => {
    stateRef.current = computeIdempotencyKey(identity, stateRef.current);
    return stateRef.current.key;
  };
}
