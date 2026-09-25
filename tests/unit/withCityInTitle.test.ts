import { describe, it, expect } from 'vitest';
import { withCityInTitle } from '@/app/lib/blogSeo';

describe('withCityInTitle', () => {
  it('adds the city before the brand suffix', () => {
    expect(withCityInTitle('Under Eye Bag Reduction | DR Youth Clinic', 'Chennai')).toBe('Under Eye Bag Reduction in Chennai');
  });
  it('leaves a title that already names the city', () => {
    expect(withCityInTitle('Hair Fall Treatment in Chennai', 'Chennai')).toBe('Hair Fall Treatment in Chennai');
  });
  it('handles a title with no brand suffix', () => {
    expect(withCityInTitle('Laser Hair Removal', 'Kochi')).toBe('Laser Hair Removal in Kochi');
  });
});
