import { describe, it, expect } from 'vitest';
import { scrubTreatmentClaims } from '@/app/lib/patientClaims';

describe('scrubTreatmentClaims', () => {
  it('removes only the sentence making the claim', () => {
    const { heroDescription } = scrubTreatmentClaims({
      heroDescription: 'This helps thinning hair. It uses FDA-approved devices. Most people need several sessions.',
    });
    expect(heroDescription).toBe('This helps thinning hair. Most people need several sessions.');
  });

  it('keeps saved HTML balanced', () => {
    const { html } = scrubTreatmentClaims({ html: '<p>The session is quick. It is painless too.</p><p>Results vary.</p>' });
    expect(html).toBe('<p>The session is quick.</p><p>Results vary.</p>');
  });

  it('drops list items and short items with nothing left', () => {
    const svc = scrubTreatmentClaims({
      whyChooseUs: ['Single-use kits', 'Real results from real patients, not stock photos', 'FDA-approved HIFU machines'],
      benefits: [{ icon: 'x', title: 'FDA Endorsed Equipment', description: 'Reliable.' }, { icon: 'y', title: 'Gentle', description: 'Suits most skin.' }],
      keywords: ['painless laser treatment', 'laser hair removal'],
    });
    expect(svc.whyChooseUs).toEqual(['Single-use kits']);
    expect(svc.benefits).toEqual([{ icon: 'y', title: 'Gentle', description: 'Suits most skin.' }]);
    expect(svc.keywords).toEqual(['laser hair removal']);
  });

  it('keeps a FAQ when its answer survives without the claim sentence', () => {
    const { faq } = scrubTreatmentClaims({
      faq: [{ question: 'Does it hurt?', answer: 'It is painless. Some people feel warmth.' }],
    });
    expect(faq).toEqual([{ question: 'Does it hurt?', answer: 'Some people feel warmth.' }]);
  });

  it('leaves honest wording alone', () => {
    const honest = {
      a: 'Hair works in cycles, so real results from QR678 usually take a few months.',
      b: 'Neither treatment is a guaranteed solution.',
      c: 'Treatments aimed at permanent results can still need touch-ups.',
    };
    expect(scrubTreatmentClaims(honest)).toEqual(honest);
  });

  it('never touches names, links, ids or non-plain values', () => {
    const when = new Date('2026-11-05');
    const svc = {
      _id: 'FDA1', name: 'Painless Laser', urlSlug: 'painless-laser', url: 'https://x.test/fda.jpg',
      heroImage: { url: 'https://x.test/painless.jpg', publicId: 'fda' }, price: 100, active: true, createdAt: when, missing: null,
    };
    expect(scrubTreatmentClaims(svc)).toEqual(svc);
  });

  it('cleans nested per-city content and blocks', () => {
    const svc = scrubTreatmentClaims({
      locationSeo: [{ location: 'kochi', localIntro: 'Visit our clinic. FDA-approved machines are used.' }],
      narrativeBlocks: [{ id: '1', type: 'paragraph', data: { html: '<p>Uses FDA cleared lasers.</p>' } }, { id: '2', type: 'bullet-list', data: { items: ['Painless sessions', 'Quick visits'] } }],
    });
    expect(svc.locationSeo[0].localIntro).toBe('Visit our clinic.');
    expect(svc.narrativeBlocks[0].data.html).toBe('<p></p>');
    expect(svc.narrativeBlocks[1].data.items).toEqual(['Quick visits']);
  });
});
