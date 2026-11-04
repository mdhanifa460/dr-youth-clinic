import { describe, it, expect } from 'vitest';
import { mentionsPatientCount, withoutPatientCounts } from '@/app/lib/patientClaims';

describe('withoutPatientCounts', () => {
  it('removes patient and treatment totals, in any wording', () => {
    const stats = ['Happy Patients', 'Patients Treated', 'Happy Clients', 'Treatments Done', 'Successful Treatments']
      .map((label) => ({ value: '1', label }));
    expect(withoutPatientCounts(stats)).toEqual([]);
  });

  it('keeps factual figures', () => {
    const stats = [{ label: 'Cities' }, { label: 'Expert Doctors' }, { label: 'Years Experience' }, { label: 'Treatments' }];
    expect(withoutPatientCounts(stats)).toHaveLength(4);
  });

  it('handles missing input', () => {
    expect(withoutPatientCounts(undefined)).toEqual([]);
  });
});

describe('mentionsPatientCount', () => {
  it('spots figures in running text', () => {
    expect(mentionsPatientCount('25,000+ Patients')).toBe(true);
    expect(mentionsPatientCount('Reached 20k happy clients')).toBe(true);
  });

  it('ignores text without a figure', () => {
    expect(mentionsPatientCount('Caring for patients since 2015')).toBe(false);
    expect(mentionsPatientCount(undefined)).toBe(false);
  });
});
