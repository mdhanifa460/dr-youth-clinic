import { describe, it, expect } from 'vitest';
import {
  buildSourceId,
  googleOwnedFields,
  googleFieldsChanged,
  googleStatusMessage,
  cooldownRemainingMs,
  stripGoogleProtectedFields,
  GOOGLE_PROTECTED_FIELDS,
} from '@/app/lib/reviews/googleReviewSync';

const SAMPLE_GOOGLE_REVIEW = {
  author_name: 'Priya S.',
  author_url: 'https://www.google.com/maps/contrib/12345',
  profile_photo_url: 'https://example.com/photo.jpg',
  rating: 5,
  text: 'Great experience!',
  time: 1700000000,
  language: 'en',
};

describe('buildSourceId', () => {
  it('combines author_url and timestamp into a stable composite id', () => {
    expect(buildSourceId(SAMPLE_GOOGLE_REVIEW)).toBe('https://www.google.com/maps/contrib/12345_1700000000');
  });
  it('falls back to author_name when author_url is missing', () => {
    const { author_url, ...rest } = SAMPLE_GOOGLE_REVIEW;
    expect(buildSourceId(rest as any)).toBe('Priya S._1700000000');
  });
});

describe('googleOwnedFields', () => {
  it('maps every Google-owned field, including meta sub-fields', () => {
    const mapped = googleOwnedFields(SAMPLE_GOOGLE_REVIEW, 'ChIJplaceid123');
    expect(mapped.authorName).toBe('Priya S.');
    expect(mapped.authorAvatar).toBe('https://example.com/photo.jpg');
    expect(mapped.rating).toBe(5);
    expect(mapped.reviewText).toBe('Great experience!');
    expect(mapped.reviewDate.getTime()).toBe(1700000000 * 1000);
    expect(mapped.meta.authorUrl).toBe('https://www.google.com/maps/contrib/12345');
    expect(mapped.meta.language).toBe('en');
    expect(mapped.meta.googleMapsUrl).toBe('https://www.google.com/maps/contrib/12345');
    expect(mapped.meta.externalPlaceId).toBe('ChIJplaceid123');
  });

  it('never invents location or services — those are not part of the mapped shape at all', () => {
    const mapped = googleOwnedFields(SAMPLE_GOOGLE_REVIEW, 'ChIJplaceid123');
    expect(mapped).not.toHaveProperty('location');
    expect(mapped).not.toHaveProperty('services');
  });
});

describe('googleFieldsChanged', () => {
  const incoming = googleOwnedFields(SAMPLE_GOOGLE_REVIEW, 'place123');

  it('returns false when every Google-owned field is identical (a genuine re-sync no-op)', () => {
    const existing = {
      authorName: 'Priya S.',
      authorAvatar: 'https://example.com/photo.jpg',
      rating: 5,
      reviewText: 'Great experience!',
      reviewDate: new Date(1700000000 * 1000),
      meta: { authorUrl: 'https://www.google.com/maps/contrib/12345', language: 'en' },
    };
    expect(googleFieldsChanged(existing, incoming)).toBe(false);
  });

  it('returns true when the review text changed (reviewer edited on Google)', () => {
    const existing = {
      authorName: 'Priya S.',
      authorAvatar: 'https://example.com/photo.jpg',
      rating: 5,
      reviewText: 'Different text now',
      reviewDate: new Date(1700000000 * 1000),
      meta: { authorUrl: 'https://www.google.com/maps/contrib/12345', language: 'en' },
    };
    expect(googleFieldsChanged(existing, incoming)).toBe(true);
  });

  it('returns true when the rating changed', () => {
    const existing = {
      authorName: 'Priya S.',
      authorAvatar: 'https://example.com/photo.jpg',
      rating: 3,
      reviewText: 'Great experience!',
      reviewDate: new Date(1700000000 * 1000),
      meta: { authorUrl: 'https://www.google.com/maps/contrib/12345', language: 'en' },
    };
    expect(googleFieldsChanged(existing, incoming)).toBe(true);
  });

  it('is not fooled by a Date-vs-string reviewDate mismatch (e.g. a .lean() document)', () => {
    const existing = {
      authorName: 'Priya S.',
      authorAvatar: 'https://example.com/photo.jpg',
      rating: 5,
      reviewText: 'Great experience!',
      reviewDate: new Date(1700000000 * 1000).toISOString(), // string, as .lean() would return
      meta: { authorUrl: 'https://www.google.com/maps/contrib/12345', language: 'en' },
    };
    expect(googleFieldsChanged(existing, incoming)).toBe(false);
  });
});

describe('googleStatusMessage', () => {
  it('gives a clear, specific message for each known Google status', () => {
    expect(googleStatusMessage('REQUEST_DENIED')).toMatch(/GOOGLE_PLACES_API_KEY/);
    expect(googleStatusMessage('OVER_QUERY_LIMIT')).toMatch(/quota/i);
    expect(googleStatusMessage('NOT_FOUND')).toMatch(/GOOGLE_PLACE_ID/);
    expect(googleStatusMessage('INVALID_REQUEST')).toMatch(/malformed/);
    expect(googleStatusMessage('ZERO_RESULTS')).toMatch(/no data/i);
    expect(googleStatusMessage('UNKNOWN_ERROR')).toMatch(/temporary/i);
  });

  it('falls back to a generic-but-informative message for an unrecognized status, without ever losing the raw status', () => {
    expect(googleStatusMessage('SOME_NEW_STATUS')).toContain('SOME_NEW_STATUS');
  });

  it('never echoes anything resembling an API key', () => {
    const msg = googleStatusMessage('REQUEST_DENIED', 'key=AIzaSySECRETKEY123');
    // The known-status branch never interpolates errorMessage at all —
    // confirming the fixed message is used, not the raw upstream text.
    expect(msg).not.toContain('AIzaSySECRETKEY123');
  });
});

describe('cooldownRemainingMs', () => {
  it('returns 0 when there has never been a sync', () => {
    expect(cooldownRemainingMs(null, 60_000)).toBe(0);
  });

  it('returns the remaining time when still within the cooldown window', () => {
    const now = 1_000_000;
    const lastSyncAt = new Date(now - 30_000); // 30s ago
    expect(cooldownRemainingMs(lastSyncAt, 60_000, now)).toBe(30_000);
  });

  it('returns 0 once the cooldown window has fully elapsed', () => {
    const now = 1_000_000;
    const lastSyncAt = new Date(now - 90_000); // 90s ago, cooldown is 60s
    expect(cooldownRemainingMs(lastSyncAt, 60_000, now)).toBe(0);
  });
});

describe('stripGoogleProtectedFields', () => {
  it('removes every Google-protected field from a patch object', () => {
    const patch = { authorName: 'x', authorAvatar: 'y', rating: 5, reviewText: 'z', location: 'chennai', isVisible: true };
    const stripped = stripGoogleProtectedFields(patch);
    for (const field of GOOGLE_PROTECTED_FIELDS) expect(stripped).not.toHaveProperty(field);
  });

  it('leaves admin-owned fields (location, services, presentation toggles) untouched', () => {
    const patch = { authorName: 'x', location: 'chennai', services: ['Hair PRP'], isVisible: false, showOnHomepage: true, isFeatured: true };
    const stripped = stripGoogleProtectedFields(patch);
    expect(stripped.location).toBe('chennai');
    expect(stripped.services).toEqual(['Hair PRP']);
    expect(stripped.isVisible).toBe(false);
    expect(stripped.showOnHomepage).toBe(true);
    expect(stripped.isFeatured).toBe(true);
  });

  it('does not mutate the original object', () => {
    const patch = { authorName: 'x', location: 'chennai' };
    stripGoogleProtectedFields(patch);
    expect(patch).toHaveProperty('authorName');
  });

  it('is a no-op on a patch with no protected fields', () => {
    const patch = { location: 'chennai', services: ['Hair PRP'] };
    expect(stripGoogleProtectedFields(patch)).toEqual(patch);
  });
});
