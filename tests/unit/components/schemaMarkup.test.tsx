import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  parseMapCoordinates,
  extractPostalCode,
  OrganizationSchema,
  LocalBusinessSchema,
} from '@/app/components/SchemaMarkup';

const json = (el: React.ReactElement | null) => {
  const html = renderToStaticMarkup(el!);
  return JSON.parse(html.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''));
};

describe('parseMapCoordinates', () => {
  it('reads lat/lng from a Google Maps embed link', () => {
    expect(parseMapCoordinates('https://www.google.com/maps/embed?pb=!1m18!2d80.22352207485945!3d13.08351221241522!2m3'))
      .toEqual({ latitude: 13.08351221241522, longitude: 80.22352207485945 });
  });
  it('reads q=lat,lng links', () => {
    expect(parseMapCoordinates('https://maps.google.com/?q=9.97,76.31')).toEqual({ latitude: 9.97, longitude: 76.31 });
  });
  it('returns null when there are no coordinates (never guesses)', () => {
    expect(parseMapCoordinates('https://maps.google.com/?q=DR+Youth+Clinic')).toBeNull();
    expect(parseMapCoordinates('')).toBeNull();
    expect(parseMapCoordinates(undefined)).toBeNull();
  });
});

describe('extractPostalCode', () => {
  it('finds an Indian PIN code', () => {
    expect(extractPostalCode('Anna Nagar, Chennai, Tamil Nadu 600040')).toBe('600040');
    expect(extractPostalCode('RS Puram, Coimbatore 641 002')).toBe('641002');
  });
  it('returns empty when there is none', () => {
    expect(extractPostalCode('Edappally, Kochi')).toBe('');
    expect(extractPostalCode('Phone 98765 43210')).toBe('');
  });
});

describe('structured data', () => {
  it('describes the brand as a MedicalOrganization (no address needed)', () => {
    const s = json(OrganizationSchema({}));
    expect(s['@type']).toBe('MedicalOrganization');
    expect(s['@id']).toMatch(/#organization$/);
    expect(s.address).toBeUndefined();
    expect(s.aggregateRating).toBeUndefined();
  });

  it('describes a branch as a clinic with address, PIN, coordinates and a link to the brand', () => {
    const s = json(LocalBusinessSchema({
      location: 'chennai', city: 'Chennai',
      address: 'Anna Nagar, Chennai, Tamil Nadu 600040', phone: '9043302224',
      hours: [{ day: 'Mon - Sat', hours: '9:00 AM - 7:00 PM' }],
      mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!2d80.2235!3d13.0835',
      imageUrl: 'https://res.cloudinary.com/x/clinic.jpg',
    }));
    expect(s['@type']).toBe('MedicalClinic');
    expect(s['@id']).toMatch(/\/chennai#clinic$/);
    expect(s.parentOrganization['@id']).toMatch(/#organization$/);
    expect(s.address.postalCode).toBe('600040');
    expect(s.geo).toEqual({ '@type': 'GeoCoordinates', latitude: 13.0835, longitude: 80.2235 });
    expect(s.image).toBe('https://res.cloudinary.com/x/clinic.jpg');
    expect(s.openingHoursSpecification[0].opens).toBe('09:00');
    expect(s.aggregateRating).toBeUndefined();
    expect(s.review).toBeUndefined();
  });

  it('leaves out postal code and coordinates it cannot read, and uses the logo when there is no photo', () => {
    const s = json(LocalBusinessSchema({ location: 'kochi', city: 'Kochi', address: 'Edappally, Kochi', mapEmbedUrl: '' }));
    expect(s.address.postalCode).toBeUndefined();
    expect(s.geo).toBeUndefined();
    expect(s.image).toBe(s.logo);
  });
});
