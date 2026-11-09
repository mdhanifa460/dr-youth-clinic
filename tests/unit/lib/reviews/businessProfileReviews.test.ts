import { describe, it, expect } from 'vitest';
import {
  starRatingToNumber,
  gbpSourceId,
  isGbpSourceId,
  gbpOwnedFields,
  gbpOwnerReply,
  suggestBranch,
  formatAddress,
  gbpErrorMessage,
} from '@/app/lib/reviews/businessProfileReviews';
import { getBusinessOAuthConfig } from '@/app/lib/google/businessProfileOAuth';

const link = { account: 'accounts/111', location: 'locations/222' };

describe('Business Profile review mapping', () => {
  it('converts Google star ratings to numbers', () => {
    expect(starRatingToNumber('FIVE')).toBe(5);
    expect(starRatingToNumber('ONE')).toBe(1);
    expect(starRatingToNumber('STAR_RATING_UNSPECIFIED')).toBeNull();
    expect(starRatingToNumber(undefined)).toBeNull();
  });

  it('uses a prefixed, stable source id that never matches older Places rows', () => {
    expect(gbpSourceId({ reviewId: 'abc' })).toBe('gbp:abc');
    expect(isGbpSourceId('gbp:abc')).toBe(true);
    expect(isGbpSourceId('https://www.google.com/maps/contrib/1_1700000000')).toBe(false);
    expect(isGbpSourceId(undefined)).toBe(false);
  });

  it('maps a review to the Google-owned fields', () => {
    const f = gbpOwnedFields({
      reviewId: 'r1',
      reviewer: { displayName: ' Priya S ', profilePhotoUrl: 'https://lh3.example/p.jpg' },
      starRating: 'FOUR',
      comment: 'Good visit',
      createTime: '2026-10-01T10:00:00Z',
    }, link);
    expect(f.authorName).toBe('Priya S');
    expect(f.authorAvatar).toBe('https://lh3.example/p.jpg');
    expect(f.rating).toBe(4);
    expect(f.reviewText).toBe('Good visit');
    expect(f.reviewDate.toISOString()).toBe('2026-10-01T10:00:00.000Z');
    expect(f.meta.externalPlaceId).toBe('accounts/111/locations/222');
  });

  it('never keeps the name or photo of an anonymous reviewer', () => {
    const f = gbpOwnedFields({ reviewId: 'r2', reviewer: { displayName: 'X', profilePhotoUrl: 'p', isAnonymous: true }, starRating: 'FIVE' }, link);
    expect(f.authorName).toBe('A Google user');
    expect(f.authorAvatar).toBe('');
  });

  it('gives rating 0 (skipped by the importer) when Google has no star rating', () => {
    expect(gbpOwnedFields({ reviewId: 'r3', starRating: 'STAR_RATING_UNSPECIFIED' }, link).rating).toBe(0);
  });

  it("reads the clinic's own reply when there is one", () => {
    expect(gbpOwnerReply({ reviewId: 'a', reviewReply: { comment: ' Thank you! ', updateTime: 't' } })).toEqual({ text: 'Thank you!', updatedAt: 't' });
    expect(gbpOwnerReply({ reviewId: 'b' })).toBeNull();
    expect(gbpOwnerReply({ reviewId: 'c', reviewReply: { comment: '  ' } })).toBeNull();
  });
});

describe('suggestBranch', () => {
  it('suggests a branch from the listing name or address', () => {
    expect(suggestBranch('DR Youth Clinic', 'Anna Nagar, Chennai, Tamil Nadu')).toBe('chennai');
    expect(suggestBranch('DR Youth Clinic Bengaluru', '')).toBe('bangalore');
    expect(suggestBranch('DR Youth', 'RS Puram, Coimbatore')).toBe('coimbatore');
    expect(suggestBranch('DR Youth', 'Edappally, Ernakulam, Kerala')).toBe('kochi');
  });
  it('suggests nothing when it cannot tell', () => {
    expect(suggestBranch('DR Youth Clinic', 'Hyderabad')).toBe('');
  });
});

describe('formatAddress', () => {
  it('joins the parts Google returns', () => {
    expect(formatAddress({ addressLines: ['12 Main Rd'], locality: 'Chennai', administrativeArea: 'TN', postalCode: '600040' }))
      .toBe('12 Main Rd, Chennai, TN, 600040');
    expect(formatAddress(undefined)).toBe('');
  });
});

describe('gbpErrorMessage', () => {
  it('explains the common Google failures in plain words', () => {
    expect(gbpErrorMessage(401, null)).toMatch(/Connect Google/);
    expect(gbpErrorMessage(403, { error: { message: 'My Business API has not been used in project 1 before or it is disabled.' } })).toMatch(/not turned on/);
    expect(gbpErrorMessage(403, { error: { status: 'PERMISSION_DENIED' } })).toMatch(/not been approved/);
    expect(gbpErrorMessage(429, { error: { status: 'RESOURCE_EXHAUSTED' } })).toMatch(/pending approval/);
    expect(gbpErrorMessage(503, null)).toMatch(/temporary/);
  });
});

describe('getBusinessOAuthConfig', () => {
  it('builds the redirect address from the site URL', () => {
    const c = getBusinessOAuthConfig({ GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 's', NEXT_PUBLIC_SITE_URL: 'https://dryouthclinics.com/' });
    expect(c.redirectUri).toBe('https://dryouthclinics.com/api/admin/google-business/callback');
  });
  it('lets GOOGLE_BUSINESS_REDIRECT_URI override it', () => {
    const c = getBusinessOAuthConfig({ GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 's', GOOGLE_BUSINESS_REDIRECT_URI: 'https://x.test/cb' });
    expect(c.redirectUri).toBe('https://x.test/cb');
  });
  it('names what is missing, without values', () => {
    expect(() => getBusinessOAuthConfig({ NEXT_PUBLIC_SITE_URL: 'https://a.test' })).toThrow(/GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET/);
  });
});
