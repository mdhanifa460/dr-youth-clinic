import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import { CRMConnector, ConnectorMappingMissingError } from "@/app/lib/crm/CRMConnector";
import { runCrmSync } from "@/app/lib/crm/sync";
import Connector from "@/app/models/Connector";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const denied = await requirePermission("integrations", "full");
  if (denied) return denied;

  await connectDB();
  const connector = await CRMConnector.loadAny();
  if (!connector) {
    return NextResponse.json({ success: false, message: "No CRM connector configured yet." }, { status: 404 });
  }

  try {
    const summary = await runCrmSync(connector, "manual");
    await (Connector as any).findByIdAndUpdate(connector.id, { "health.lastSyncAt": new Date() });
    return NextResponse.json({ success: true, ...summary });
  } catch (e: any) {
    if (e instanceof ConnectorMappingMissingError) {
      return NextResponse.json({ success: false, message: e.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: e?.message || "Sync failed" }, { status: 500 });
  }
}
