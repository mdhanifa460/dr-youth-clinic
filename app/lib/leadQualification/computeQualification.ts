// Deterministic Lead Qualification scoring — the core of the engine.
// Pure function: no DB access, no AI, no randomness. Given a booking's own
// fields plus whatever related signals the caller already fetched, and the
// admin-configured rules/thresholds, it always returns the same result for
// the same inputs. AI must never be able to influence this — see the
// project-wide rule in the implementation plan that AI output is a
// read-only annotation, never a scoring input.
import type { ISettings } from '@/app/models/Settings';
import type { LeadTemperature } from '@/app/models/Booking';

export interface QualifiableBooking {
  phone?: string;
  service?: string;
  location?: string;
  status?: string;
  isReturnVisit?: boolean;
  treatmentValue?: number | null;
  utmCampaign?: string;
}

// Everything here must be sourced from data that ACTUALLY exists today —
// see app/lib/leadQualification/signals.ts for how each of these is
// fetched. Never invent a signal that isn't backed by a real record.
export interface RelatedSignals {
  assessmentCompleted?: boolean;
  assessmentRiskLevel?: string; // Lead.assessmentResult.riskLevel / severity, whatever string it stores
  hasBookingSuccessEvent?: boolean;
}

export interface QualificationBreakdownEntry {
  ruleId: string;
  label: string;
  points: number;
}

export interface QualificationResult {
  score: number;
  temperature: LeadTemperature;
  breakdown: QualificationBreakdownEntry[];
  version: string;
}

type LeadQualificationSettings = ISettings['leadQualification'];

// Fixed catalog of event keys the engine understands — matched against
// Settings.leadQualification.scoringRules[].event by admin config, not
// hardcoded per-rule anywhere else. Adding a genuinely new scoreable signal
// means adding one case here (and updating signals.ts if it needs a DB
// lookup); it never means touching the scoring loop itself.
function matchesEvent(event: string, booking: QualifiableBooking, signals: RelatedSignals): boolean {
  switch (event) {
    case 'phone_present':
      return !!booking.phone;
    case 'service_selected':
      return !!booking.service;
    case 'location_selected':
      return !!booking.location;
    case 'assessment_completed':
      return !!signals.assessmentCompleted;
    case 'high_assessment_risk':
      return /high/i.test(signals.assessmentRiskLevel || '');
    case 'status_contacted':
      return booking.status === 'contacted';
    case 'status_confirmed':
      return booking.status === 'confirmed';
    case 'status_arrived':
      return booking.status === 'arrived';
    case 'status_completed':
      return booking.status === 'completed';
    case 'return_visit':
      return !!booking.isReturnVisit;
    case 'treatment_value_set':
      return typeof booking.treatmentValue === 'number' && booking.treatmentValue > 0;
    case 'utm_campaign_present':
      return !!booking.utmCampaign;
    case 'booking_success_event':
      return !!signals.hasBookingSuccessEvent;
    default:
      // An unrecognized event key (e.g. stale config after a rule catalog
      // change) never matches and never throws — it just silently
      // contributes nothing, same "don't guess" posture as everywhere else
      // in this engine.
      return false;
  }
}

export function computeQualification(
  booking: QualifiableBooking,
  signals: RelatedSignals,
  settings: LeadQualificationSettings | null | undefined
): QualificationResult {
  const rules = settings?.scoringRules ?? [];
  const thresholds = settings?.thresholds ?? [];
  const version = settings?.version ?? '';

  const breakdown: QualificationBreakdownEntry[] = [];
  let rawScore = 0;

  for (const rule of rules) {
    if (!rule || rule.enabled === false) continue;
    // '' (or unset) branch = applies to every location; a non-empty branch
    // only applies when it matches this booking's location exactly.
    if (rule.branch && rule.branch !== booking.location) continue;
    if (matchesEvent(rule.event, booking, signals)) {
      const points = rule.points || 0;
      rawScore += points;
      breakdown.push({ ruleId: rule.id, label: rule.description || rule.event, points });
    }
  }

  const score = Math.max(0, Math.min(100, rawScore));

  const match = thresholds.find(
    (t) => t && t.active !== false && score >= t.minScore && score <= t.maxScore
  );
  const temperature: LeadTemperature = (match?.key as LeadTemperature) || 'unclassified';

  return { score, temperature, breakdown, version };
}
