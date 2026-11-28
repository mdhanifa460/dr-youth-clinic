import { canonicalizeLocation } from "./locationNormalize";

// Branch scoping for admin routes. A user's AdminUser.assignedClinics is
// either ["all"] or a list of branch slugs ("chennai", ...), but the branch
// stored on a Booking/Appointment/Lead is free text written inconsistently
// ("chennai", "Chennai", "Chennai Clinic"), so a plain === or $in on the raw
// strings would wrongly lock staff out of their own branch's records. Both
// helpers below compare through canonicalizeLocation() instead.
//
// A record with no branch (e.g. a lead-source lead whose branch couldn't be
// resolved) is only reachable by users with access to all branches, the same
// rule the list routes have always applied.

type BranchScopedUser = { assignedClinics?: string[] | null };

function clinicsOf(user: BranchScopedUser): string[] {
  return user.assignedClinics ?? ["all"];
}

function toKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  if (!raw) return null;
  return canonicalizeLocation(raw) ?? raw;
}

export function hasAllBranches(user: BranchScopedUser): boolean {
  return clinicsOf(user).includes("all");
}

/** True when this user may see/act on a record stored under `branch`. */
export function canAccessBranch(user: BranchScopedUser, branch: unknown): boolean {
  if (hasAllBranches(user)) return true;
  const key = toKey(branch);
  if (!key) return false;
  return clinicsOf(user).some((c) => toKey(c) === key);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * A Mongo condition for a branch field that limits results to this user's
 * branches, or null when the user can see every branch. Case-insensitive
 * and tolerant of "Chennai Clinic"-style values, matching canAccessBranch().
 * An empty assignedClinics list yields `{ $in: [] }`, which matches nothing.
 */
export function branchCondition(user: BranchScopedUser): { $in: RegExp[] } | null {
  if (hasAllBranches(user)) return null;
  const patterns = clinicsOf(user)
    .map((c) => (typeof c === "string" ? c.trim() : ""))
    .filter(Boolean)
    .map((c) => new RegExp(escapeRegex(c), "i"));
  return { $in: patterns };
}

/**
 * Narrows a user-supplied branch filter to the user's own branches: returns
 * the condition to put on the branch field, or "forbidden" when the user
 * asked for a branch they can't see. A requested branch is never allowed to
 * replace the restriction.
 */
export function scopedBranchFilter(
  user: BranchScopedUser,
  requested: string | null | undefined
): { $in: RegExp[] } | RegExp | "forbidden" | null {
  const wanted = (requested || "").trim();
  if (wanted) {
    if (!canAccessBranch(user, wanted)) return "forbidden";
    return new RegExp(escapeRegex(wanted), "i");
  }
  return branchCondition(user);
}

export const BRANCH_FORBIDDEN_MESSAGE = "You do not have access to this branch.";

// Which branch an assessment Lead (app/models/Lead.ts) belongs to: the
// patient's own clinic choice first, then the QR/link's clinic, then the
// legacy free-text city.
export function assessmentLeadBranch(lead: { preferredClinic?: string; clinicLocation?: string; city?: string } | null | undefined): string {
  return lead?.preferredClinic || lead?.clinicLocation || lead?.city || "";
}

// Mongo filter equivalent of assessmentLeadBranch() + branchCondition(), or
// null when the user can see every branch.
export function assessmentLeadBranchQuery(user: BranchScopedUser): Record<string, unknown> | null {
  const cond = branchCondition(user);
  if (!cond) return null;
  const empty = { $in: ["", null] };
  return {
    $or: [
      { preferredClinic: cond },
      { preferredClinic: empty, clinicLocation: cond },
      { preferredClinic: empty, clinicLocation: empty, city: cond },
    ],
  };
}
