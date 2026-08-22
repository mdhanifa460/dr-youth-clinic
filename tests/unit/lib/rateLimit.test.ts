import { describe, it, expect } from 'vitest';
import { atomicIncrement } from '@/app/lib/rateLimit';

// No KV_REST_API_URL/TOKEN is set in the test environment, so these
// exercise the in-memory fallback path deliberately — the same path
// app/lib/bookingCapacity.ts's reserveCapacitySlot() falls back to when
// Redis isn't configured. Real distributed atomicity (the Redis INCR
// path) is Redis's own well-established guarantee, not something to
// re-prove here; live verification against real Upstash Redis is done
// separately (see the Phase 2 report's live-verification section).
describe('atomicIncrement — the shared counter primitive behind Booking Capacity', () => {
  it('increments sequentially for the same key', async () => {
    const key = `test-${Date.now()}-seq`;
    expect(await atomicIncrement(key, 60)).toBe(1);
    expect(await atomicIncrement(key, 60)).toBe(2);
    expect(await atomicIncrement(key, 60)).toBe(3);
  });

  it('different keys have independent counters (branch A does not affect branch B)', async () => {
    const keyA = `test-${Date.now()}-branchA`;
    const keyB = `test-${Date.now()}-branchB`;
    await atomicIncrement(keyA, 60);
    await atomicIncrement(keyA, 60);
    expect(await atomicIncrement(keyA, 60)).toBe(3);
    expect(await atomicIncrement(keyB, 60)).toBe(1); // untouched by keyA's increments
  });

  it('CONCURRENCY: N simultaneous callers against the same key each get a unique, sequential count — none collide', async () => {
    const key = `test-${Date.now()}-concurrent`;
    const N = 20;
    const results = await Promise.all(Array.from({ length: N }, () => atomicIncrement(key, 60)));
    const sorted = [...results].sort((a, b) => a - b);
    // Exactly 1..N, no duplicates, no gaps — proves the race condition
    // described in the audit (two simultaneous requests both reading a
    // stale count and both passing) cannot happen through this primitive:
    // every caller gets a genuinely distinct sequence number.
    expect(sorted).toEqual(Array.from({ length: N }, (_, i) => i + 1));
  });

  it('CAPACITY SEMANTICS: given a concurrent burst against capacity=10, exactly 10 callers see "within capacity" and the rest are correctly rejected', async () => {
    const key = `test-${Date.now()}-capacity10`;
    const capacity = 10;
    const N = 15; // 15 simultaneous "customers", only 10 should be allowed
    const results = await Promise.all(Array.from({ length: N }, () => atomicIncrement(key, 60)));
    const allowed = results.filter((count) => count <= capacity);
    const rejected = results.filter((count) => count > capacity);
    expect(allowed.length).toBe(10);
    expect(rejected.length).toBe(5);
  });
});
