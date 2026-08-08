import { describe, it, expect } from 'vitest';
import { applyFieldMapping, combineDateTimeIso, type MappingFieldDef } from '@/app/lib/crm/fieldMapping';

const LEAD_MAPPING: MappingFieldDef[] = [
  { platformField: 'name', externalField: 'Customer_Name', required: true },
  { platformField: 'phone', externalField: 'Phone', transform: 'phone.normalize', required: true },
  { platformField: 'service', externalField: 'Enquiry_For' },
];

describe('applyFieldMapping — push direction', () => {
  it('maps platform fields to external fields, applying transforms', () => {
    const { mapped, missingRequired } = applyFieldMapping(
      { name: 'Gokul', phone: '8667849998', service: 'Hair PRP' },
      LEAD_MAPPING,
      'push'
    );
    expect(mapped).toEqual({
      Customer_Name: 'Gokul',
      Phone: '918667849998',
      Enquiry_For: 'Hair PRP',
    });
    expect(missingRequired).toEqual([]);
  });

  it('reports missing required platform fields without sending a partial payload silently', () => {
    const { mapped, missingRequired } = applyFieldMapping({ service: 'Hair PRP' }, LEAD_MAPPING, 'push');
    expect(missingRequired).toEqual(['name', 'phone']);
    expect(mapped.Customer_Name).toBeUndefined();
  });
});

describe('applyFieldMapping — pull direction', () => {
  it('maps external CRM fields back to platform fields', () => {
    const { mapped, missingRequired } = applyFieldMapping(
      { Customer_Name: 'Priya', Phone: '9876543210', Enquiry_For: 'Skin' },
      LEAD_MAPPING,
      'pull'
    );
    expect(mapped).toEqual({ name: 'Priya', phone: '919876543210', service: 'Skin' });
    expect(missingRequired).toEqual([]);
  });

  it('reports missing required external fields on pull', () => {
    const { missingRequired } = applyFieldMapping({ Enquiry_For: 'Skin' }, LEAD_MAPPING, 'pull');
    expect(missingRequired).toEqual(['Customer_Name', 'Phone']);
  });
});

describe('combineDateTimeIso', () => {
  it('combines a date and time string into one ISO timestamp', () => {
    const iso = combineDateTimeIso('2026-08-15', '11:00 AM');
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('returns empty string for an empty date', () => {
    expect(combineDateTimeIso('', '11:00 AM')).toBe('');
  });

  it('returns empty string for an unparseable date', () => {
    expect(combineDateTimeIso('not-a-date', '')).toBe('');
  });
});
