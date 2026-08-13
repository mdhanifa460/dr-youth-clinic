// Pure, unit-testable rule-based status logic for the Domain Migration
// dashboard (app/api/admin/domain-migration/route.ts). Extracted out of
// the route so it can be tested without a DB/GA4/GSC connection — same
// pattern already used for app/lib/ai/simpleIntents.ts's pure gates.
//
// Deliberately rule-based, not a blended average: an averaged score can
// hide one real problem (e.g. overall share looks fine but a high-traffic
// URL 404s). The WORST applicable signal decides the status, per the
// approved Domain Migration audit's Section 9 methodology.

export type MigrationHealthStatus = 'healthy' | 'monitor' | 'significant' | 'insufficient_data';
export type MigrationRecommendation = 'safe_to_review' | 'continue_redirect' | 'significant_old_traffic' | 'connect_data_sources';

export interface MigrationHealthThresholds {
  healthy: number;      // old-domain share (%) below which a signal counts as healthy
  monitor: number;       // old-domain share (%) above which a signal counts as significant
  organicFloor: number;  // old-domain organic-impression share (%) above which it's significant on its own
}

export interface MigrationHealthInput {
  // Each share is a percentage 0-100, or null when that signal genuinely
  // isn't available yet (e.g. GA4 migrated-traffic dimension not
  // registered, or zero combined volume to compute a share from) — null
  // is excluded from every rule below, never treated as 0.
  oldSharePct: number | null;
  oldLeadSharePct: number | null;
  oldOrganicSharePct: number | null;
  brokenTopUrls: number;
  thresholds: MigrationHealthThresholds;
}

export interface MigrationHealthResult {
  status: MigrationHealthStatus;
  recommendation: MigrationRecommendation;
  reasons: string[];
}

export function computeMigrationHealth(input: MigrationHealthInput): MigrationHealthResult {
  const { oldSharePct, oldLeadSharePct, oldOrganicSharePct, brokenTopUrls, thresholds } = input;
  const reasons: string[] = [];

  const isSignificant =
    (oldSharePct !== null && oldSharePct > thresholds.monitor) ||
    (oldLeadSharePct !== null && oldLeadSharePct > thresholds.monitor) ||
    brokenTopUrls > 0 ||
    (oldOrganicSharePct !== null && oldOrganicSharePct > thresholds.organicFloor);

  if (oldSharePct !== null && oldSharePct > thresholds.monitor) {
    reasons.push(`Old-domain traffic share is ${oldSharePct.toFixed(1)}%, above the ${thresholds.monitor}% threshold.`);
  }
  if (oldLeadSharePct !== null && oldLeadSharePct > thresholds.monitor) {
    reasons.push(`Old-domain lead share is ${oldLeadSharePct.toFixed(1)}%, above the ${thresholds.monitor}% threshold.`);
  }
  if (brokenTopUrls > 0) {
    reasons.push(`${brokenTopUrls} high-traffic old URL${brokenTopUrls === 1 ? '' : 's'} ${brokenTopUrls === 1 ? "doesn't" : "don't"} redirect correctly.`);
  }
  if (oldOrganicSharePct !== null && oldOrganicSharePct > thresholds.organicFloor) {
    reasons.push(`Old-domain organic impressions are still ${oldOrganicSharePct.toFixed(1)}% of the combined total.`);
  }

  if (isSignificant) {
    return { status: 'significant', recommendation: 'significant_old_traffic', reasons };
  }

  const isMonitor =
    (oldSharePct !== null && oldSharePct > thresholds.healthy) ||
    (oldLeadSharePct !== null && oldLeadSharePct > thresholds.healthy);

  if (isMonitor) {
    if (oldSharePct !== null && oldSharePct > thresholds.healthy) {
      reasons.push(`Old-domain traffic share is ${oldSharePct.toFixed(1)}%, above the ${thresholds.healthy}% healthy threshold but under the ${thresholds.monitor}% significant threshold.`);
    }
    if (oldLeadSharePct !== null && oldLeadSharePct > thresholds.healthy && oldLeadSharePct <= thresholds.monitor) {
      reasons.push(`Old-domain lead share is ${oldLeadSharePct.toFixed(1)}%, above the ${thresholds.healthy}% healthy threshold but under the ${thresholds.monitor}% significant threshold.`);
    }
    return { status: 'monitor', recommendation: 'continue_redirect', reasons };
  }

  // Every share signal is null AND no broken redirect was even checkable
  // — i.e. genuinely nothing has been measured yet (no GA4/GSC connected,
  // no leads/bookings in the window), not "measured and found healthy".
  // Defaulting this to 'healthy' would be a false all-clear — a business
  // decision this dashboard exists specifically to prevent (see the
  // audit's explicit "don't use one thin signal" requirement). Only
  // reachable when brokenTopUrls is also 0, since brokenTopUrls > 0 alone
  // already forces 'significant' above regardless of the three shares.
  if (oldSharePct === null && oldLeadSharePct === null && oldOrganicSharePct === null) {
    reasons.push('No data sources are connected yet — traffic, lead, and organic signals are all unavailable, not confirmed healthy. Connect GA4 and Search Console in Settings → Analytics → Domain Migration.');
    return { status: 'insufficient_data', recommendation: 'connect_data_sources', reasons };
  }

  reasons.push('Old-domain traffic, leads, and organic presence are all under their healthy thresholds, and every checked redirect resolves correctly.');
  return { status: 'healthy', recommendation: 'safe_to_review', reasons };
}
