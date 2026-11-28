import { describe, it, expect } from 'vitest';
import { canAccess, ALL_MODULES, ALL_ROLES, ROLE_PERMISSIONS } from '@/app/lib/permissions';

// Patient assessment records (answers, photos, AI summaries, doctor notes)
// are a separate module from 'ai-assessment' (editing the quiz itself).
describe('assessment-records permission', () => {
  it('is listed so the Team page can show and override it', () => {
    expect(ALL_MODULES).toContain('assessment-records');
    for (const role of ALL_ROLES) {
      expect(ROLE_PERMISSIONS[role]['assessment-records']).toBeDefined();
    }
  });

  it('only owners, super admins and doctors can edit or approve', () => {
    const canEdit = ALL_ROLES.filter((r) => canAccess(r, 'assessment-records', 'full'));
    expect(canEdit.sort()).toEqual(['clinic_owner', 'doctor', 'super_admin']);
  });

  it('front-desk roles can view but not edit', () => {
    for (const role of ['receptionist', 'customer_support'] as const) {
      expect(canAccess(role, 'assessment-records', 'view')).toBe(true);
      expect(canAccess(role, 'assessment-records', 'full')).toBe(false);
    }
  });

  it('marketing, content and finance roles have no access to patient records', () => {
    for (const role of ['marketing_manager', 'content_editor', 'finance_manager'] as const) {
      expect(canAccess(role, 'assessment-records', 'view')).toBe(false);
    }
  });

  it('marketing and content editors keep their quiz-editing access', () => {
    expect(canAccess('marketing_manager', 'ai-assessment', 'full')).toBe(true);
    expect(canAccess('content_editor', 'ai-assessment', 'full')).toBe(true);
  });

  it('an owner can still grant one person access via an override', () => {
    expect(canAccess('marketing_manager', 'assessment-records', 'view', { 'assessment-records': 'view' })).toBe(true);
  });
});
