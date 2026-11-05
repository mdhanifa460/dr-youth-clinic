import { describe, it, expect } from 'vitest';
import { cleanCredentialWording, hasUnsupportedClaim, mentionsPatientCount, scrubClaims, withClinicYears, withClinicYearsText, withLiveStats, withoutPatientClaims } from '@/app/lib/patientClaims';

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

describe('withLiveStats', () => {
  it('replaces typed-in counts with live ones and keeps the years figure', () => {
    const saved = [{ value: '9+', label: 'Years of Excellence' }, { value: '20+', label: 'Expert Doctors' }, { value: '50+', label: 'Advanced Treatments' }];
    const live = [{ label: 'Clinics', value: 4 }, { label: 'Doctors', value: 8 }, { label: 'Treatments', value: 84 }];
    expect(withLiveStats(saved, live).map((s) => [s.value, s.label])).toEqual([
      ['9+', 'Years of Excellence'], ['4', 'Clinics'], ['8', 'Doctors'], ['84', 'Treatments'],
    ]);
  });

  it('leaves out a count of zero', () => {
    expect(withLiveStats([], [{ label: 'Doctors', value: 0 }])).toEqual([]);
  });
});

describe('hasUnsupportedClaim', () => {
  it('catches regulatory, accreditation, superlative and outcome claims', () => {
    for (const text of ['US FDA Endorsed Equipment', 'NABH Compliant', 'IADVL Member', 'ISO Certified', 'the best aesthetic clinic in India', 'Virtually painless', 'Clinically proven', 'natural, lasting results', 'Save up to 50%', 'Limited-time deals', '10k+ Successful Procedures', '10K+ subscribers']) {
      expect(hasUnsupportedClaim(text), text).toBe(true);
    }
  });

  it('leaves ordinary copy and honest disclaimers alone', () => {
    for (const text of ['Your best self', 'Results vary and no outcome is guaranteed', 'Personalised treatment plans', 'Skin and hair care']) {
      expect(hasUnsupportedClaim(text), text).toBe(false);
    }
  });
});

describe('cleanCredentialWording', () => {
  it('rewrites dermatologist claims to doctors', () => {
    expect(cleanCredentialWording('Our expert dermatologists are ready')).toBe('Our doctors are ready');
    expect(cleanCredentialWording('performed by a board-certified dermatologist or aesthetic physician')).toBe('performed by a doctor');
    expect(cleanCredentialWording('Board certified aesthetic physician, dedicated')).toBe('Aesthetic physician, dedicated');
  });

  it('removes the best-clinic clause and keeps the sentence', () => {
    expect(cleanCredentialWording('A consultation matters first, something the best aesthetic clinics always start with. PRP helps.')).toBe('A consultation matters first. PRP helps.');
  });
});

describe('scrubClaims', () => {
  it('keeps a larger item such as a hero slide, without the claim field', () => {
    const [slide] = scrubClaims([{ badge: 'The best aesthetic clinic', headline: 'Customized Treatments', highlightText: 'For You', description: 'Plans for you', image: { url: 'x' } }]);
    expect(slide).toEqual({ headline: 'Customized Treatments', highlightText: 'For You', description: 'Plans for you', image: { url: 'x' } });
  });

  it('drops claim items from lists, removes claim fields, and keeps links', () => {
    const out = scrubClaims({
      badge: 'Looking for the best aesthetic clinic in India?',
      headline: 'Customized Treatments',
      description: 'Our dermatologists plan your care',
      reasons: ['US FDA Endorsed Equipment', 'Clean & Secure Setting'],
      seals: ['NABH Certified', 'Reviewed by doctors'],
      faqs: [
        { question: 'Are your doctors certified dermatologists?', answer: 'Yes.' },
        { question: 'Is it painful?', answer: 'Numbing cream is applied.' },
      ],
      ctaHref: '/best-aesthetic-clinic',
      image: { url: 'https://example.com/fda.jpg' },
    });
    expect(out).toEqual({
      headline: 'Customized Treatments',
      description: 'Our doctors plan your care',
      reasons: ['Clean & Secure Setting'],
      seals: ['Reviewed by doctors'],
      faqs: [{ question: 'Is it painful?', answer: 'Numbing cream is applied.' }],
      ctaHref: '/best-aesthetic-clinic',
      image: { url: 'https://example.com/fda.jpg' },
    });
  });
});
