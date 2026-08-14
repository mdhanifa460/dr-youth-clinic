// Fallback used whenever Settings.leadQualification is missing on the
// stored document — the same "old document predates this field, Mongoose's
// .lean() read won't backfill it" situation this project has hit repeatedly
// this session (see HOMEPAGE_DEFAULTS, VideoAI autoCategorizeEnabled).
// Every call site that reads settings.leadQualification MUST fall back to
// this, not assume the field exists. The engine still ships disabled
// (enabled: false) even here, so a bare deploy never silently starts
// scoring leads before an admin has reviewed/saved real rules.
//
// These threshold/rule numbers are the same illustrative defaults from the
// original spec (Cold 0-24 / Warm 25-49 / Hot 50-74 / Very Hot 75-100) —
// they exist as DATA an admin can see and edit in the settings UI on first
// load, never as fallback logic hardcoded inside computeQualification()
// itself.
import type { ISettings } from '@/app/models/Settings';

export const DEFAULT_LEAD_QUALIFICATION: ISettings['leadQualification'] = {
  enabled: false,
  version: 'v1',
  thresholds: [
    { id: 'cold', key: 'cold', label: 'Cold', minScore: 0, maxScore: 24, order: 1, color: '#60A5FA', active: true },
    { id: 'warm', key: 'warm', label: 'Warm', minScore: 25, maxScore: 49, order: 2, color: '#F59E0B', active: true },
    { id: 'hot', key: 'hot', label: 'Hot', minScore: 50, maxScore: 74, order: 3, color: '#FB923C', active: true },
    { id: 'very_hot', key: 'very_hot', label: 'Very Hot', minScore: 75, maxScore: 100, order: 4, color: '#EF4444', active: true },
  ],
  scoringRules: [
    { id: 'service_selected', event: 'service_selected', points: 5, enabled: true, branch: '', description: 'Treatment/service selected' },
    { id: 'assessment_completed', event: 'assessment_completed', points: 15, enabled: true, branch: '', description: 'Assessment completed' },
    { id: 'high_assessment_risk', event: 'high_assessment_risk', points: 15, enabled: true, branch: '', description: 'High assessment concern' },
    { id: 'status_contacted', event: 'status_contacted', points: 10, enabled: true, branch: '', description: 'Team made contact' },
    { id: 'status_confirmed', event: 'status_confirmed', points: 20, enabled: true, branch: '', description: 'Appointment confirmed' },
    { id: 'status_arrived', event: 'status_arrived', points: 25, enabled: true, branch: '', description: 'Patient arrived' },
    { id: 'status_completed', event: 'status_completed', points: 30, enabled: true, branch: '', description: 'Treatment completed' },
    { id: 'return_visit', event: 'return_visit', points: 5, enabled: true, branch: '', description: 'Returning visitor' },
    { id: 'treatment_value_set', event: 'treatment_value_set', points: 5, enabled: true, branch: '', description: 'Treatment value estimated' },
    { id: 'utm_campaign_present', event: 'utm_campaign_present', points: 5, enabled: true, branch: '', description: 'Arrived via a tracked campaign' },
    { id: 'booking_success_event', event: 'booking_success_event', points: 10, enabled: true, branch: '', description: 'Engaged on booking confirmation page' },
  ],
  notifyOnHot: { enabled: false, minTemperature: 'hot' },
};
