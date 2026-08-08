import { Doctor } from "@/app/models/Doctor";
import { LocationContent } from "@/app/models/LocationContent";
import ConnectorSyncRun from "@/app/models/ConnectorSyncRun";
import { CRMConnector } from "./CRMConnector";

export interface SyncSummary {
  itemsTotal: number;
  itemsSynced: number;
  itemsUnmatched: number;
  itemsFailed: number;
}

// Pulls doctors + branches from the CRM into the local cache (architecture
// review §06 — hybrid synced cache, not a live passthrough). Deliberately
// conservative: only ever writes `active`/`locations` on an existing
// Doctor, and only the `crmSync` subdocument on an existing LocationContent
// — curated content (photos, bios, gallery, before/after pairs, hours)
// is never touched by a sync. A CRM branch with no matching local
// LocationContent doc is reported as "unmatched" rather than
// auto-creating a content page with no real marketing content behind it.
export async function runCrmSync(connector: CRMConnector, trigger: "scheduled" | "manual"): Promise<SyncSummary> {
  const run = await (ConnectorSyncRun as any).create({
    connectorId: connector.id,
    trigger,
    scope: ["doctors", "branches"],
    status: "running",
  });

  const summary: SyncSummary = { itemsTotal: 0, itemsSynced: 0, itemsUnmatched: 0, itemsFailed: 0 };

  try {
    const doctorResult = await syncDoctors(connector);
    const branchResult = await syncBranches(connector);

    summary.itemsTotal = doctorResult.itemsTotal + branchResult.itemsTotal;
    summary.itemsSynced = doctorResult.itemsSynced + branchResult.itemsSynced;
    summary.itemsUnmatched = doctorResult.itemsUnmatched + branchResult.itemsUnmatched;
    summary.itemsFailed = doctorResult.itemsFailed + branchResult.itemsFailed;

    await (ConnectorSyncRun as any).findByIdAndUpdate(run._id, {
      finishedAt: new Date(),
      itemsTotal: summary.itemsTotal,
      itemsSynced: summary.itemsSynced,
      itemsUnmatched: summary.itemsUnmatched,
      itemsFailed: summary.itemsFailed,
      status: summary.itemsFailed > 0 ? "completed_with_errors" : "completed",
    });
  } catch (e: any) {
    await (ConnectorSyncRun as any).findByIdAndUpdate(run._id, {
      finishedAt: new Date(),
      status: "failed",
      errorMessage: e?.message || "Sync failed",
    });
    throw e;
  }

  return summary;
}

async function syncDoctors(connector: CRMConnector): Promise<SyncSummary> {
  const summary: SyncSummary = { itemsTotal: 0, itemsSynced: 0, itemsUnmatched: 0, itemsFailed: 0 };
  const crmDoctors = await connector.getDoctors();
  summary.itemsTotal = crmDoctors.length;

  for (const crmDoctor of crmDoctors) {
    try {
      const existing = await (Doctor as any).findOne({ externalCrmId: crmDoctor.externalId });
      if (existing) {
        // Operational fields only — name/photo/bio/qualifications stay
        // admin-authored even for a synced doctor.
        existing.active = crmDoctor.active;
        if (crmDoctor.locations.length) existing.locations = crmDoctor.locations;
        existing.crmSyncedAt = new Date();
        await existing.save();
      } else {
        // Minimal stub — an admin fills in title/photo/bio/qualifications
        // via the existing Doctor CRUD, exactly like adding any new doctor
        // today. `title` is a required, non-empty field on Doctor (Mongoose
        // rejects an empty string same as missing), so a real placeholder
        // is needed, not "". Created inactive regardless of the CRM's own
        // active flag — a stub with no photo/bio should never go public
        // automatically; an admin reviewing and completing the profile is
        // what flips it active.
        await (Doctor as any).create({
          name: crmDoctor.name,
          title: "Profile pending — complete in Doctors",
          locations: crmDoctor.locations.length ? crmDoctor.locations : ["all"],
          active: false,
          externalCrmId: crmDoctor.externalId,
          crmSyncedAt: new Date(),
        });
      }
      summary.itemsSynced++;
    } catch {
      summary.itemsFailed++;
    }
  }
  return summary;
}

async function syncBranches(connector: CRMConnector): Promise<SyncSummary> {
  const summary: SyncSummary = { itemsTotal: 0, itemsSynced: 0, itemsUnmatched: 0, itemsFailed: 0 };
  const crmBranches = await connector.getBranches();
  summary.itemsTotal = crmBranches.length;

  for (const crmBranch of crmBranches) {
    try {
      // Matched by location key (lowercased CRM branch name) — a real
      // deployment would more likely match by an explicit code, but
      // without real CRM docs yet this is the safest available signal.
      const locationKey = crmBranch.name.trim().toLowerCase();
      const existing = await (LocationContent as any).findOne({ location: locationKey });

      if (existing) {
        await (LocationContent as any).findOneAndUpdate(
          { location: locationKey },
          {
            $set: {
              "crmSync.externalCrmId": crmBranch.externalId,
              "crmSync.crmSyncedAt": new Date(),
              "crmSync.crmActive": crmBranch.active,
            },
          }
        );
        summary.itemsSynced++;
      } else {
        // No content page to attach to — flagged, not auto-created, since
        // a real branch page needs curated content this sync can't supply.
        summary.itemsUnmatched++;
      }
    } catch {
      summary.itemsFailed++;
    }
  }
  return summary;
}
