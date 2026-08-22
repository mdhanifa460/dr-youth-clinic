import { describe, it, expect } from 'vitest';
import { computeIdempotencyKey } from '@/app/lib/useIdempotencyKey';

describe('computeIdempotencyKey — reuse across a retry of the SAME attempt, regenerate on a genuinely new one', () => {
  it('generates a fresh key when there is no previous state', () => {
    const result = computeIdempotencyKey({ name: 'John', phone: '9999999999' }, null);
    expect(result.key).toBeTruthy();
    expect(result.snapshot).toBe(JSON.stringify({ name: 'John', phone: '9999999999' }));
  });

  it('reuses the SAME key when the identity is unchanged (a manual retry after a network failure)', () => {
    const identity = { name: 'John', phone: '9999999999', service: 'Skin', date: '2026-08-25', time: '10:00 AM' };
    const first = computeIdempotencyKey(identity, null);
    const retry = computeIdempotencyKey(identity, first);
    expect(retry.key).toBe(first.key);
  });

  it('generates a NEW key when the identity changes (a genuinely different booking attempt)', () => {
    const first = computeIdempotencyKey({ name: 'John', service: 'Skin' }, null);
    const second = computeIdempotencyKey({ name: 'John', service: 'Hair' }, first);
    expect(second.key).not.toBe(first.key);
  });

  it('two independent calls with no shared state (simulating two separate browser tabs) produce different keys', () => {
    const identity = { name: 'John', phone: '9999999999' };
    const tabA = computeIdempotencyKey(identity, null);
    const tabB = computeIdempotencyKey(identity, null);
    // Each tab has its own React state (no `prev`), so each mints its own
    // key even for identical data — this is exactly why idempotency keys
    // alone can't catch the multi-tab case; documented as a known scope
    // boundary, not a bug in this function.
    expect(tabA.key).not.toBe(tabB.key);
  });

  it('reverting a change back to a previously-submitted value still counts as new (no history beyond the immediately-prior snapshot)', () => {
    const v1 = { service: 'Skin' };
    const v2 = { service: 'Hair' };
    const first = computeIdempotencyKey(v1, null);
    const changed = computeIdempotencyKey(v2, first);
    const revertedBack = computeIdempotencyKey(v1, changed);
    expect(revertedBack.key).not.toBe(first.key);
  });
});
