// Pure logic for importing reviews from the Google Business Profile API
// (all reviews for every branch, with Google's own stable review IDs).
// No network or database access here, so it is unit-testable.
import type { GoogleOwnedFields } from '@/app/lib/reviews/googleReviewSync';

export const BRANCHES = ['chennai', 'bangalore', 'coimbatore', 'kochi'] as const;
export type Branch = (typeof BRANCHES)[number];

// One Google listing (location) and the branch an admin matched it to.
// branch '' means "don't import this listing".
export interface BusinessLocationLink {
  account: string;   // "accounts/123"
  location: string;  // "locations/456"
  title: string;
  address: string;
  branch: Branch | '';
  averageRating?: number | null;
  totalReviewCount?: number | null;
}

// Shape of one review from GET v4/{account}/{location}/reviews.
export interface GbpReview {
  name?: string;
  reviewId: string;
  reviewer?: { displayName?: string; profilePhotoUrl?: string; isAnonymous?: boolean };
  starRating?: 'STAR_RATING_UNSPECIFIED' | 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE' | string;
  comment?: string;
  createTime?: string;
  updateTime?: string;
  reviewReply?: { comment?: string; updateTime?: string };
}

const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

export function starRatingToNumber(star: string | undefined): number | null {
  return (star && STARS[star]) || null;
}

// Prefixed so these never collide with the older Places API rows, whose
// sourceId is "<author url>_<unix time>".
export function gbpSourceId(review: Pick<GbpReview, 'reviewId'>): string {
  return `gbp:${review.reviewId}`;
}

export function isGbpSourceId(sourceId: string | undefined | null): boolean {
  return typeof sourceId === 'string' && sourceId.startsWith('gbp:');
}

// Fields Google owns. The rating is required by the importer; a review
// without a usable star rating is skipped by the caller.
export function gbpOwnedFields(review: GbpReview, link: Pick<BusinessLocationLink, 'account' | 'location'>): GoogleOwnedFields & { rating: number } {
  const anonymous = !!review.reviewer?.isAnonymous;
  return {
    authorName: anonymous ? 'A Google user' : (review.reviewer?.displayName || 'A Google user').trim(),
    authorAvatar: anonymous ? '' : review.reviewer?.profilePhotoUrl || '',
    rating: starRatingToNumber(review.starRating) ?? 0,
    reviewText: review.comment || '',
    reviewDate: new Date(review.createTime || review.updateTime || 0),
    meta: {
      authorUrl: '',
      language: '',
      googleMapsUrl: '',
      externalPlaceId: `${link.account}/${link.location}`,
    },
  };
}

// The clinic's reply as posted on Google, if any (read-only here).
export function gbpOwnerReply(review: GbpReview): { text: string; updatedAt: string } | null {
  const text = review.reviewReply?.comment?.trim();
  return text ? { text, updatedAt: review.reviewReply?.updateTime || '' } : null;
}

// Best guess at which branch a Google listing is, from its name and
// address. Only a suggestion: an admin confirms it before anything imports.
export function suggestBranch(title: string, address: string): Branch | '' {
  const s = `${title} ${address}`.toLowerCase();
  if (/\bchennai\b|\bmadras\b/.test(s)) return 'chennai';
  if (/\bbangalore\b|\bbengaluru\b/.test(s)) return 'bangalore';
  if (/\bcoimbatore\b|\bkovai\b/.test(s)) return 'coimbatore';
  if (/\bkochi\b|\bcochin\b|\bernakulam\b/.test(s)) return 'kochi';
  return '';
}

export function formatAddress(addr: { addressLines?: string[]; locality?: string; administrativeArea?: string; postalCode?: string } | undefined): string {
  if (!addr) return '';
  return [...(addr.addressLines || []), addr.locality, addr.administrativeArea, addr.postalCode].filter(Boolean).join(', ');
}

// Clear, admin-facing message for a failed Google call. Never echoes tokens;
// only Google's own status/message text, which contains none.
export function gbpErrorMessage(status: number, body: any): string {
  const gStatus: string = body?.error?.status || '';
  const gMessage: string = body?.error?.message || '';
  if (status === 401) return 'Google sign-in has expired or was removed. Please click "Connect Google" again.';
  if (status === 403 && /has not been used|is disabled|SERVICE_DISABLED/i.test(`${gMessage} ${JSON.stringify(body?.error?.details || '')}`)) {
    return 'A required Google API is not turned on in the Google Cloud project (My Business Account Management, My Business Business Information, and Google My Business API). Turn them on and try again.';
  }
  if (status === 403) return 'Google refused access. Either Business Profile API access has not been approved for this Google Cloud project yet, or the connected Google account does not manage this listing.';
  if (status === 429 || gStatus === 'RESOURCE_EXHAUSTED') {
    return 'Google\'s request limit was reached. This usually means API access is still pending approval (the limit is 0 until approved), or too many syncs ran at once. Try again later.';
  }
  if (status === 404) return 'Google could not find this listing. Reload the listings and check the branch matching.';
  if (status >= 500) return 'Google had a temporary problem. Try again in a few minutes.';
  return `Google returned an error (${status}${gStatus ? ` ${gStatus}` : ''}).`;
}
