// Wires computeQualification() to the database — the only place in this
// engine that writes anything. Kept separate from the pure scoring function
// so computeQualification()/its unit tests never touch Mongoose at all.
import { getSettings } from '@/app/models/Settings';
import Booking from '@/app/models/Booking';
import LeadQualificationHistory from '@/app/models/LeadQualificationHistory';
import { computeQualification, QualifiableBooking, QualificationResult } from './computeQualification';
import { getRelatedSignals } from './signals';
import { DEFAULT_LEAD_QUALIFICATION } from './defaults';

export type QualificationReason =
  | 'auto:initial'
  | 'auto:status_change'
  | 'manual_override'
  | 'rule_change_recalc';

export interface QualifyOptions {
  reason: QualificationReason;
  actor?: string | null; // AdminUser _id, when a staff action triggered this
}

// Computes + persists a Booking's qualification fields, and writes a
// LeadQualificationHistory row for the initial score, an actual temperature
// change, or an explicitly staff-driven reason — never on a no-op recompute,
// to keep the audit collection meaningful rather than noisy. Returns null
// (and touches nothing) when the engine is disabled in Settings, so a fresh
// deploy never silently starts scoring leads before an admin has reviewed
// the rules.
export async function qualifyAndPersist(
  booking: QualifiableBooking & { _id: unknown; bookingId?: string; leadTemperature?: string },
  options: QualifyOptions
): Promise<QualificationResult | null> {
  const settings = await getSettings();
  const config = settings.leadQualification ?? DEFAULT_LEAD_QUALIFICATION;
  if (!config?.enabled) return null;

  const signals = await getRelatedSignals(booking);
  const result = computeQualification(booking, signals, config);

  const previousTemperature = booking.leadTemperature || 'unclassified';
  const changed = previousTemperature !== result.temperature;

  await (Booking as any).findByIdAndUpdate(booking._id, {
    $set: {
      leadScore: result.score,
      leadTemperature: result.temperature,
      leadTemperatureUpdatedAt: new Date(),
      qualificationVersion: result.version,
      qualificationBreakdown: result.breakdown.map((b) => ({ ...b, matchedAt: new Date() })),
    },
  });

  const shouldLogHistory =
    options.reason === 'auto:initial' ||
    options.reason === 'manual_override' ||
    options.reason === 'rule_change_recalc' ||
    changed;

  if (shouldLogHistory) {
    // An audit-row write failure must never block the actual scoring
    // write above — the booking's live temperature is the source of truth,
    // history is best-effort trail alongside it.
    await (LeadQualificationHistory as any)
      .create({
        leadId: booking._id,
        score: result.score,
        temperature: result.temperature,
        reason: options.reason,
        qualificationVersion: result.version,
        actor: options.actor || null,
      })
      .catch(() => {});
  }

  return result;
}
