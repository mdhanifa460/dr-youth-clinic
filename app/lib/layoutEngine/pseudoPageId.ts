import { createHash } from 'crypto';

// Section.pageId is typed as ObjectId because most page types (Service,
// Blog, LandingPage, Doctor, Offer) are real Mongo documents with a real
// _id. Home and Location pages aren't — Home is a singleton with no
// document at all, and Location pages are keyed by a static slug from
// app/data/locations.ts, not a Mongo model. Mongoose casts any valid
// 24-hex-char string to an ObjectId, so a deterministic hash of a stable
// string key slots into the exact same schema without a type change or a
// second pageId shape to branch on anywhere else in the engine.
export function pseudoPageId(key: string): string {
  return createHash('md5').update(key).digest('hex').slice(0, 24);
}

export const HOME_PAGE_ID = pseudoPageId('home');
