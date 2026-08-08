import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import Connector from "@/app/models/Connector";
import ConnectorFieldMapping from "@/app/models/ConnectorFieldMapping";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requirePermission("integrations", "view");
  if (denied) return denied;

  await connectDB();
  const connector = await (Connector as any).findOne({ type: "crm" }).lean();
  if (!connector) return NextResponse.json({ success: true, data: [] });

  const mappings = await (ConnectorFieldMapping as any).find({ connectorId: connector._id }).lean();
  return NextResponse.json({ success: true, data: mappings });
}

// Replaces the field list for one capability + direction — e.g. saving the
// "lead" / "push" row from the Field Mapping tab. Upsert, so the first save
// for a capability creates it.
export async function PUT(req: NextRequest) {
  const denied = await requirePermission("integrations", "full");
  if (denied) return denied;

  await connectDB();
  const body = await req.json();
  const { capability, direction, fields } = body;

  if (!capability || !["push", "pull"].includes(direction) || !Array.isArray(fields)) {
    return NextResponse.json({ success: false, message: "capability, direction, and fields[] are required" }, { status: 400 });
  }

  const connector = await (Connector as any).findOne({ type: "crm" });
  if (!connector) {
    return NextResponse.json({ success: false, message: "Create the CRM connector before saving field mappings." }, { status: 404 });
  }

  const cleanFields = fields
    .filter((f: any) => f?.platformField && f?.externalField)
    .map((f: any) => ({
      platformField: String(f.platformField),
      externalField: String(f.externalField),
      transform: String(f.transform || ""),
      required: Boolean(f.required),
    }));

  const mapping = await (ConnectorFieldMapping as any).findOneAndUpdate(
    { connectorId: connector._id, capability, direction },
    { connectorId: connector._id, capability, direction, fields: cleanFields },
    { upsert: true, new: true }
  );

  return NextResponse.json({ success: true, data: mapping });
}
