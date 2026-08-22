import { connectDB } from '@/app/lib/mongodb';
import { LeadSourceMapping, type ILeadSourceMapping } from '@/app/models/LeadSourceMapping';

export interface ResolveBranchInput {
  source: string;
  providerAccountId?: string;
  providerPhone?: string;
  whatsappPhoneNumberId?: string;
}

export interface ResolveBranchResult {
  branch: string | null;
  mapping: ILeadSourceMapping | null;
  // Which identifier actually matched — surfaced so a webhook handler (or
  // an admin debugging a misrouted lead) can see WHY a branch was picked,
  // not just that one was.
  matchedOn: 'whatsappPhoneNumberId' | 'providerAccountId' | 'providerPhone' | null;
}

const UNRESOLVED: ResolveBranchResult = { branch: null, mapping: null, matchedOn: null };

type Candidate = Pick<ILeadSourceMapping, 'branch' | 'providerAccountId' | 'providerPhone' | 'whatsappPhoneNumberId' | 'active' | 'updatedAt'>;

// Pure decision logic, deliberately separated from the DB query below so
// it's fully unit-testable without a database — the actual "which of
// these mappings wins" rule, exercised directly in
// tests/unit/lib/leadSourceMapping/resolveBranch.test.ts.
//
// Lookup priority, in order:
//   1. whatsappPhoneNumberId (only meaningful for WhatsApp — Meta's own
//      stable ID, never rotates the way a displayed phone number can)
//   2. providerAccountId (the provider's own listing/account/campaign/
//      lead ID — preferred over phone for JustDial/IndiaMART specifically,
//      since a provider account can change its displayed phone without
//      changing its account ID)
//   3. providerPhone (fallback, for a payload that only carries a phone
//      number and no account/listing ID)
// Within one priority tier, the most recently updated ACTIVE mapping wins
// — lets an admin fix a misconfigured mapping by adding a corrected row
// rather than needing to delete the old one first.
export function pickBestMapping(candidates: Candidate[], input: ResolveBranchInput): ResolveBranchResult {
  const active = candidates.filter((c) => c.active);
  const byRecency = (a: Candidate, b: Candidate) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

  if (input.whatsappPhoneNumberId) {
    const matches = active.filter((c) => c.whatsappPhoneNumberId === input.whatsappPhoneNumberId).sort(byRecency);
    if (matches[0]) return { branch: matches[0].branch, mapping: matches[0] as ILeadSourceMapping, matchedOn: 'whatsappPhoneNumberId' };
  }
  if (input.providerAccountId) {
    const matches = active.filter((c) => c.providerAccountId === input.providerAccountId).sort(byRecency);
    if (matches[0]) return { branch: matches[0].branch, mapping: matches[0] as ILeadSourceMapping, matchedOn: 'providerAccountId' };
  }
  if (input.providerPhone) {
    const matches = active.filter((c) => c.providerPhone === input.providerPhone).sort(byRecency);
    if (matches[0]) return { branch: matches[0].branch, mapping: matches[0] as ILeadSourceMapping, matchedOn: 'providerPhone' };
  }
  return UNRESOLVED;
}

// The one place that turns "a lead arrived from JustDial, on listing
// JD-CHN-001" into "this belongs to the Chennai branch" — every inbound
// webhook/API integration (JustDial, IndiaMART, WhatsApp, future
// providers) calls this instead of embedding its own source→branch logic,
// so a new listing or a reassigned number is an admin edit here, never a
// code change anywhere else.
//
// Fetches every active mapping for this `source` in one query (a clinic's
// total mapping count is small — tens, not thousands) and hands the
// decision to the pure pickBestMapping() above. Returns
// { branch: null } — never a guessed/default branch — when nothing
// matches, exactly like every other "unresolved ≠ silently assumed"
// convention already established in this codebase (originDomain,
// leadTemperature: "unclassified"). The caller decides what to do with an
// unresolved lead (flag it for manual assignment, etc.) — this function
// never decides that for them.
export async function resolveBranchForLead(input: ResolveBranchInput): Promise<ResolveBranchResult> {
  const source = (input.source || '').trim().toLowerCase();
  if (!source) return UNRESOLVED;
  if (!input.whatsappPhoneNumberId && !input.providerAccountId && !input.providerPhone) return UNRESOLVED;

  await connectDB();
  const candidates = await (LeadSourceMapping as any).find({ source, active: true }).lean();
  return pickBestMapping(candidates, input);
}
