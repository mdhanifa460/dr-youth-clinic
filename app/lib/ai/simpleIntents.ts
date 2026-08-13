// Cost-control short-circuit for /api/ai-chat: a handful of message shapes
// are simple, structured lookups a deterministic backend query answers
// exactly as well as an LLM would — a specific-time availability check, a
// named-branch info request, a generic "what do you treat" question — so
// paying for an embedding + LLM generation call on them is pure waste.
//
//   User → simple intent? → YES → backend query, ₹0 AI call
//                          → NO  → full RAG + AI path (unchanged)
//
// Every detector below is deliberately conservative: it only fires on an
// unambiguous, short, template-shaped message, and returns null (never a
// guess) the moment anything about the message suggests the patient wants
// more than a lookup — a symptom, a comparison, a "why", extra context.
// Falling through to the existing AI path is always safe; it's what
// already happens today. A wrong SKIP would mean answering a nuanced
// question with a canned lookup, which these detectors are written to
// avoid — a wrong FIRE just costs an AI call that didn't need to be
// skipped, which is the harmless direction to err in when in doubt.
//
// Each detector splits into a pure "is this message a candidate for this
// intent" gate (no DB access, unit-testable — see
// tests/unit/lib/simpleIntents.test.ts) and the async lookup that actually
// queries real data once the gate passes. detectSimpleIntent() is the
// single entry point route.ts calls.
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { LocationContent } from '@/app/models/LocationContent';
import { locations as STATIC_LOCATIONS } from '@/app/data/locations';
import { BRANCH_SLUGS } from '@/app/lib/locationNormalize';
import { getServiceCities, getEffectiveSlug } from '@/app/lib/serviceSeo';
import { getDoctorAvailability } from '@/app/lib/doctorAvailability';
import { parseDateTimeAssumeToday, type ParsedDateTime } from '@/app/lib/parseDateTime';

export interface SimpleIntentCard {
  type: 'service' | 'location';
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
}

export interface SimpleIntentResult {
  text: string;
  cards: SimpleIntentCard[];
}

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function formatTime12h(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// ─────────────────────────────────────────────────────────────────────────
// 1. Specific-time availability check — "check 11am availability",
//    "is 5pm tomorrow free". Reuses the exact same real-data source as the
//    AI-grounded path (app/lib/doctorAvailability.ts — real Appointment/
//    DoctorSlotBlock records, never a guess), just skips paying for an AI
//    call to phrase the answer. Requires BOTH a parseable time AND an
//    explicit availability word — a message with a stray time in it but no
//    availability framing ("I had my facial at 11am and...") won't parse
//    as this intent's target, but the keyword gate is extra insurance.
// ─────────────────────────────────────────────────────────────────────────
const AVAILABILITY_WORDS = ['available', 'availability', 'slot', 'free', 'open', 'book', 'appointment'];

// Pure gate: does this message + known location look like a same-turn,
// answerable-without-AI availability check? Returns the parsed slot (never
// guesses) or null. No DB access, so this is directly unit-testable.
// `now` is injectable (defaults to the real clock) so tests can pin a
// fixed reference point instead of asserting against wall-clock time.
export function matchAvailabilityCandidate(message: string, resolvedLocation: string | null, now: Date = new Date()): ParsedDateTime | null {
  if (!resolvedLocation) return null;
  if (wordCount(message) > 15) return null;
  const lower = message.toLowerCase();
  if (!AVAILABILITY_WORDS.some((w) => lower.includes(w))) return null;
  return parseDateTimeAssumeToday(message, now);
}

export async function checkAvailabilityIntent(message: string, resolvedLocation: string | null): Promise<SimpleIntentResult | null> {
  const slot = matchAvailabilityCandidate(message, resolvedLocation);
  if (!slot || !resolvedLocation) return null;

  try {
    await connectDB();
    const result = await getDoctorAvailability(resolvedLocation, slot.date, slot.time);
    const cityLabel = STATIC_LOCATIONS[resolvedLocation]?.name || resolvedLocation;
    const niceTime = formatTime12h(slot.time);

    if (!result.open) {
      // "not_configured" is its own sentence shape — confirmed against a
      // real branch during testing, where the deployed data actually hits
      // this case (LocationContent has no operatingHours set for that day
      // yet) — the other two reasons read naturally as "clinic is ___",
      // this one doesn't ("clinic is doesn't have hours set up" is broken
      // grammar), so it gets its own template rather than being forced
      // through the shared "is ${why}" phrasing.
      if (result.reason === 'not_configured') {
        return { text: `We don't have hours set up yet for ${slot.date} at our ${cityLabel} clinic — please call to confirm, or I can help you book a consultation and the clinic will confirm a time.`, cards: [] };
      }
      const why = result.reason === 'holiday' ? `closed for a holiday (${result.holidayLabel})` : 'closed that day';
      return { text: `Our ${cityLabel} clinic is ${why} on ${slot.date}, so ${niceTime} isn't bookable then. Want to check a different day, or book a consultation and we'll confirm a time?`, cards: [] };
    }

    const free = result.doctors.filter((d) => d.available);
    if (free.length === 0) {
      return { text: `No doctor is free at exactly ${niceTime} on ${slot.date} at our ${cityLabel} clinic. Want me to check a nearby time, or take a booking request and the clinic will confirm the closest available slot?`, cards: [] };
    }
    const names = free.map((d) => `${d.name} (${d.title})`).join(', ');
    return { text: `Yes — at our ${cityLabel} clinic, ${names} ${free.length === 1 ? 'is' : 'are'} free at ${niceTime} on ${slot.date}. Want to book that slot?`, cards: [] };
  } catch (e) {
    console.error('[simpleIntents] availability check failed', e);
    return null; // fall through to the full AI path rather than fail the turn
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Named-branch clinic info — "Show Chennai clinic", "Bangalore branch
//    address". The city must be named IN the message itself (not just the
//    widget's ambient ?location=), since that's the only way the patient's
//    intent to ask about that specific city is unambiguous. Prefers the
//    admin-edited LocationContent doc (the real source of truth an admin
//    can actually update) over the static seed data in app/data/locations.ts,
//    same fallback order the public Services Hub page already uses.
// ─────────────────────────────────────────────────────────────────────────
const CLINIC_WORD_RE = /\b(clinic|branch|centre|center)\b/i;

// Pure gate: extracts the named branch slug this message is asking about,
// or null if the message doesn't look like an unambiguous "show me clinic
// X" request. No DB access.
export function matchClinicInfoCandidate(message: string): string | null {
  if (wordCount(message) > 12) return null;
  if (!CLINIC_WORD_RE.test(message)) return null;
  const lower = message.toLowerCase();
  return BRANCH_SLUGS.find((slug) => lower.includes(slug) || lower.includes(STATIC_LOCATIONS[slug]?.name?.toLowerCase() || '__none__')) || null;
}

export async function clinicInfoIntent(message: string): Promise<SimpleIntentResult | null> {
  const city = matchClinicInfoCandidate(message);
  if (!city) return null;

  try {
    await connectDB();
    const doc = await (LocationContent as any).findOne({ location: city }).select('clinicInfo').lean();
    const fallback = STATIC_LOCATIONS[city];
    const address = doc?.clinicInfo?.address || fallback?.address || '';
    const phone = doc?.clinicInfo?.phone || fallback?.phone || '';
    const hours: Array<{ day: string; hours: string }> = (doc?.clinicInfo?.hours?.length ? doc.clinicInfo.hours : fallback?.hours) || [];
    if (!address && !phone && hours.length === 0) return null; // nothing real to say — let the AI handle it

    const cityLabel = fallback?.name || city;
    const hoursText = hours.map((h) => `${h.day}: ${h.hours}`).join(', ');
    const text = [
      `Our ${cityLabel} clinic${address ? ` is at ${address}` : ''}.`,
      phone ? `You can call ${phone}.` : '',
      hoursText ? `Hours — ${hoursText}.` : '',
    ].filter(Boolean).join(' ');

    return {
      text,
      cards: [{ type: 'location', id: city, title: `${cityLabel} Clinic`, subtitle: address, href: `/${city}` }],
    };
  } catch (e) {
    console.error('[simpleIntents] clinic info lookup failed', e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Generic treatment/service listing — "list treatments", "what
//    treatments do you offer", "what services do you have". Deliberately
//    narrow: any word suggesting the patient actually wants a specific
//    recommendation (a concern, a body part, "for", "best", "suitable",
//    "recommend"...) skips this and falls through to the full AI path,
//    which is what actually reasons about fit — this only ever answers
//    "what's on the menu", never "what's right for me".
// ─────────────────────────────────────────────────────────────────────────
const LIST_TREATMENTS_RE = /^(what|which|list|show( me)?|tell me)\b.*\b(treatments?|services?)\b/i;
const DISQUALIFYING_WORDS = [
  'for ', 'best', 'suitable', 'recommend', 'suggest', 'pain', 'hurt', 'scar', 'allerg',
  'side effect', 'cost of my', 'my skin', 'my hair', 'suffering', 'problem with',
];

// Pure gate: does this message look like a plain "what's on the menu"
// question, with nothing suggesting the patient wants a tailored
// recommendation instead? No DB access.
export function isTreatmentListingCandidate(message: string): boolean {
  if (wordCount(message) > 10) return false;
  if (!LIST_TREATMENTS_RE.test(message.trim())) return false;
  const lower = message.toLowerCase();
  return !DISQUALIFYING_WORDS.some((w) => lower.includes(w));
}

export async function listTreatmentsIntent(message: string, resolvedLocation: string | null): Promise<SimpleIntentResult | null> {
  if (!isTreatmentListingCandidate(message)) return null;

  try {
    await connectDB();
    const query: any = { status: 'active' };
    if (resolvedLocation) {
      query.$or = [
        { targetLocations: resolvedLocation },
        { targetLocations: { $exists: false }, location: { $in: [resolvedLocation, 'all'] } },
      ];
    }
    const services = await (Service as any)
      .find(query)
      .select('name category price urlSlug targetLocations location locationSeo')
      .sort({ category: 1, name: 1 })
      .limit(8)
      .lean();
    if (services.length === 0) return null; // nothing to list — let the AI handle it gracefully

    const cards: SimpleIntentCard[] = services.map((s: any) => {
      const cities = getServiceCities(s);
      const city = resolvedLocation && cities.includes(resolvedLocation) ? resolvedLocation : cities[0];
      const href = city && s.urlSlug ? `/${city}/services/${String(s.category || '').toLowerCase()}/${getEffectiveSlug(s, city)}` : undefined;
      return { type: 'service', id: String(s._id), title: s.name, subtitle: s.category, href };
    });

    const names = services.map((s: any) => s.name).join(', ');
    const text = `Here's what we offer: ${names}. Want details on any of these, or should I help you book a consultation?`;
    return { text, cards };
  } catch (e) {
    console.error('[simpleIntents] treatment listing failed', e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Entry point — tries each detector in order (most structurally-confident
// first) and returns the first match. Callers should skip this entirely
// for the same cases the existing AI path already treats specially (an
// escalation-rule match, a non-first-message conversation needing prior
// context) — that's route.ts's responsibility, not this module's.
// ─────────────────────────────────────────────────────────────────────────
export async function detectSimpleIntent(message: string, resolvedLocation: string | null): Promise<SimpleIntentResult | null> {
  const availability = await checkAvailabilityIntent(message, resolvedLocation);
  if (availability) return availability;

  const clinicInfo = await clinicInfoIntent(message);
  if (clinicInfo) return clinicInfo;

  const treatments = await listTreatmentsIntent(message, resolvedLocation);
  if (treatments) return treatments;

  return null;
}
