import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import Connector from "@/app/models/Connector";
import ConnectorFieldMapping from "@/app/models/ConnectorFieldMapping";

export const dynamic = "force-dynamic";

// Same shape as /api/admin/integrations/crm/mapping (capability + fields[]
// of {platformField, externalField, transform, required, staticValue}),
// scoped to one connector by _id instead of the CRM singleton — capability
// is always "intake" here (there's only one kind of thing a lead-source
// webhook receives), direction is always "pull" (their field names -> ours).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("integrations", "view");
  if (denied) return denied;

  await connectDB();
  const mapping = await (ConnectorFieldMapping as any)
    .findOne({ connectorId: params.id, capability: "intake", direction: "pull" })
    .lean();
  return NextResponse.json({ success: true, data: mapping?.fields || [] });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("integrations", "full");
  if (denied) return denied;

  await connectDB();
  const { fields } = await req.json();
  if (!Array.isArray(fields)) {
    return NextResponse.json({ success: false, message: "fields[] is required" }, { status: 400 });
  }

  const connector = await (Connector as any).findOne({ _id: params.id, type: "lead_source" });
  if (!connector) return NextResponse.json({ success: false, message: "Connector not found" }, { status: 404 });

  // pull direction: platformField (ours) is the destination, so it's
  // always required; externalField (theirs) is the source, required
  // unless a staticValue stands in for it — same rule the CRM mapping
  // route uses, just direction-fixed here since this route never does push.
  const cleanFields = fields
    .filter((f: any) => {
      const isStatic = !!f?.staticValue;
      return f?.platformField && (isStatic || f?.externalField);
    })
    .map((f: any) => ({
      platformField: String(f.platformField || ""),
      externalField: String(f.externalField || ""),
      transform: String(f.transform || ""),
      required: Boolean(f.required),
      staticValue: String(f.staticValue || ""),
    }));

  const mapping = await (ConnectorFieldMapping as any).findOneAndUpdate(
    { connectorId: connector._id, capability: "intake", direction: "pull" },
    { connectorId: connector._id, capability: "intake", direction: "pull", fields: cleanFields },
    { upsert: true, new: true }
  );

  return NextResponse.json({ success: true, data: mapping });
}
