// Homepage Personalization Engine — Phase 1 (foundation). Shared between
// client call sites (postInterestEvent) and the API route (event-type
// validation) so there's one definition of what a valid event is, not two
// that can drift apart — same reasoning as assessmentFlow.ts's
// postAssessmentEvent for the (separate, older) assessment funnel.
//
// Default weights below are the ones from the original product spec —
// admin-configurable weights (Phase 2) will supersede these at score-
// computation time; this list only exists to validate incoming events and
// document what each one means, not to compute anything yet.
export const EVENT_TYPES = [
  'page_view',            // viewed a treatment/service page — default weight 5
  'blog_read',             // read a blog post — default weight 3
  'video_watch',           // watched a video to >=75% — default weight 8
  'assessment_completed',  // completed a pre-consultation assessment — default weight 25
  'doctor_view',           // viewed a doctor's profile — default weight 10
  'booking_started',       // began the booking form — default weight 30
] as const;

export type InterestEventType = typeof EVENT_TYPES[number];

const VISITOR_COOKIE = 'visitor_id';

function getVisitorIdFromCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|; )visitor_id=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

// Fire-and-forget, same contract as assessmentFlow.ts's postAssessmentEvent
// — never blocks or throws into the caller; a dropped interest event should
// never be able to break the page it was fired from. visitor_id itself is
// read server-side from the request's own cookie (see the API route), not
// sent in the body — the client doesn't need to know its own id.
export function postInterestEvent(eventType: InterestEventType, category: string, meta?: Record<string, unknown>) {
  try {
    if (!getVisitorIdFromCookie()) return; // middleware hasn't set it yet (e.g. very first request in a browser session); skip rather than fabricate one client-side
    fetch('/api/interest-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, category, meta: meta || {} }),
    }).catch(() => {});
  } catch {
    // no-op — tracking must never throw into the calling page
  }
}

// Resolves one of this codebase's 5 pre-existing, mutually-inconsistent
// category systems (Service.category, Blog.category, Video.category,
// Doctor.specializations — see the architecture note above them in each
// model) into this engine's own dedicated taxonomy (hair/skin/body/
// weight-loss). Deliberately conservative: an ambiguous source value
// (Service's "Laser" — hair removal or skin resurfacing? Blog's
// "Aesthetics"/"General"; Video's "Technology"/"FAQ"/etc.) returns null
// rather than guessing, so a page fires no event at all sooner than a
// wrong one that pollutes a visitor's interest profile. Note this means
// "body" and "weight-loss" currently have no page_view/blog_read/
// video_watch source at all (no content model has a matching category
// value today) — those two categories only accumulate signal via
// assessment_completed until real content is tagged for them.
export function resolveInterestCategory(source: string | null | undefined): string | null {
  if (!source) return null;
  const s = source.toLowerCase().trim();
  if (s.includes('hair')) return 'hair';
  if (s.includes('skin') || s.includes('acne') || s.includes('botox') || s.includes('prp') || s.includes('gfc')) return 'skin';
  if (s.includes('weight')) return 'weight-loss';
  if (s.includes('body') || s.includes('slim') || s.includes('contour')) return 'body';
  return null;
}
