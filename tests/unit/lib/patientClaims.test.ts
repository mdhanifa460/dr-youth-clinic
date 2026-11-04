import { describe, it, expect } from 'vitest';
import { mentionsPatientCount, withClinicYears, withClinicYearsText, withoutPatientClaims } from '@/app/lib/patientClaims';

describe('withoutPatientClaims', () => {
  it('removes patient and treatment totals, in any wording', () => {
    const stats = ['Happy Patients', 'Patients Treated', 'Happy Clients', 'Treatments Done', 'Successful Treatments']
      .map((label) => ({ value: '1', label }));
    expect(withoutPatientClaims(stats)).toEqual([]);
  });

  it('keeps factual figures', () => {
    const stats = [{ label: 'Cities' }, { label: 'Expert Doctors' }, { label: 'Years Experience' }, { label: 'Treatments' }];
    expect(withoutPatientClaims(stats)).toHaveLength(4);
  });

  it('handles missing input', () => {
    expect(withoutPatientClaims(undefined)).toEqual([]);
  });
});

describe('ratings', () => {
  it('removes ratings by label or by value', () => {
    expect(withoutPatientClaims([{ label: 'Google Rating', value: '4.7/5' }, { label: 'Score', value: '4.9★' }])).toEqual([]);
  });
});

describe('withClinicYears', () => {
  it('replaces whatever years figure was saved', () => {
    expect(withClinicYears([{ label: 'Years of Excellence', value: '20+' }])[0].value).toBe('9+');
  });

  it('leaves other stats alone', () => {
    expect(withClinicYears([{ label: 'Expert Doctors', value: '10+' }])[0].value).toBe('10+');
  });
});

describe('withClinicYearsText', () => {
  it('replaces the figure and keeps the wording', () => {
    expect(withClinicYearsText("20+ years' experience")).toBe("9+ years' experience");
    expect(withClinicYearsText('20 years of expertise in hair')).toBe('9+ years of expertise in hair');
  });

  it('leaves unrelated text alone', () => {
    expect(withClinicYearsText('Back to routine same day')).toBe('Back to routine same day');
    expect(withClinicYearsText('Lasts up to 5 years')).toBe('Lasts up to 5 years');
    expect(withClinicYearsText(undefined)).toBeUndefined();
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
