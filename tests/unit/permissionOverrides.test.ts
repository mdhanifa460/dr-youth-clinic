import { describe, it, expect } from 'vitest';
import { canAccess } from '@/app/lib/permissions';

describe('canAccess with per-user overrides', () => {
  it('falls back to the role default when no override is set', () => {
    expect(canAccess('receptionist', 'leads', 'view')).toBe(false);
  });
  it('an override can grant access beyond the role default', () => {
    expect(canAccess('receptionist', 'leads', 'view', { leads: 'view' })).toBe(true);
  });
  it('an override can restrict access below the role default', () => {
    expect(canAccess('clinic_owner', 'leads', 'full')).toBe(true);
    expect(canAccess('clinic_owner', 'leads', 'full', { leads: 'view' })).toBe(false);
  });
  it('an override only affects the module it names, not others', () => {
    const overrides = { leads: 'view' as const };
    expect(canAccess('receptionist', 'leads', 'view', overrides)).toBe(true);
    expect(canAccess('receptionist', 'settings', 'view', overrides)).toBe(false);
  });
  it('a null/undefined overrides map behaves exactly like no overrides', () => {
    expect(canAccess('receptionist', 'leads', 'view', undefined)).toBe(false);
    expect(canAccess('receptionist', 'leads', 'view', null as any)).toBe(false);
  });
});
