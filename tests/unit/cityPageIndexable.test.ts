import { describe, it, expect, afterEach } from 'vitest';
import { isCityPageIndexable, getLocalContent } from '@/app/lib/serviceSeo';

const intro = 'x'.repeat(130);
const svc = (extra: any = {}) => ({ location: 'all', ...extra });

describe('isCityPageIndexable', () => {
  afterEach(() => { delete process.env.CITY_PAGE_NOINDEX; });
  it('keeps the primary city (Chennai) indexable', () => {
    expect(isCityPageIndexable(svc(), 'chennai')).toBe(true);
  });
  it('noindexes other cities that have no local content', () => {
    expect(isCityPageIndexable(svc(), 'kochi')).toBe(false);
  });
  it('indexes a city once it has a real local intro', () => {
    const s = svc({ locationSeo: [{ location: 'kochi', localIntro: intro }] });
    expect(isCityPageIndexable(s, 'kochi')).toBe(true);
  });
  it('ignores a too-short intro', () => {
    const s = svc({ locationSeo: [{ location: 'kochi', localIntro: 'short' }] });
    expect(isCityPageIndexable(s, 'kochi')).toBe(false);
  });
  it('uses the first city as primary when Chennai is not offered', () => {
    const s = svc({ location: 'kochi', targetLocations: ['kochi', 'bangalore'] });
    expect(isCityPageIndexable(s, 'kochi')).toBe(true);
    expect(isCityPageIndexable(s, 'bangalore')).toBe(false);
  });
  it('a single-city service is always indexable', () => {
    expect(isCityPageIndexable({ location: 'kochi' }, 'kochi')).toBe(true);
  });
  it('can be switched off', () => {
    process.env.CITY_PAGE_NOINDEX = 'off';
    expect(isCityPageIndexable(svc(), 'kochi')).toBe(true);
  });
  it('getLocalContent drops incomplete FAQ rows', () => {
    const s = { locationSeo: [{ location: 'kochi', localIntro: intro, localFaq: [{ question: 'q', answer: '' }, { question: 'a?', answer: 'b' }] }] };
    expect(getLocalContent(s, 'kochi').faq).toHaveLength(1);
  });
});
