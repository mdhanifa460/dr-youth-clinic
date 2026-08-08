import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import { CRMConnector, ConnectorNotConfiguredError } from "@/app/lib/crm/CRMConnector";

export const dynamic = "force-dynamic";

export async function POST() {
  const denied = await requirePermission("integrations", "full");
  if (denied) return denied;

  await connectDB();
  const connector = await CRMConnector.loadAny();
  if (!connector) {
    return NextResponse.json({ success: false, message: "No CRM connector configured yet." }, { status: 404 });
  }

  try {
    const result = await connector.testConnection();
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    if (e instanceof ConnectorNotConfiguredError) {
      return NextResponse.json({ success: false, message: e.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: e?.message || "Test connection failed" }, { status: 500 });
  }
}
