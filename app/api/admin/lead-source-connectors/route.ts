import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import Connector from "@/app/models/Connector";

export const dynamic = "force-dynamic";

// Unlike the CRM connector (a singleton — Connector.findOne({type:"crm"})),
// lead-source connectors are inherently multiple: one per provider
// (JustDial, IndiaMART, WhatsApp, ...), sometimes more than one per
// provider (a JustDial connector per region if they ever split callback
// URLs). Every route here operates on a specific connector by _id, never
// "the" connector.
export async function GET() {
  const denied = await requirePermission("integrations", "view");
  if (denied) return denied;

  await connectDB();
  const connectors = await (Connector as any).find({ type: "lead_source" }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ success: true, data: connectors });
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission("integrations", "full");
  if (denied) return denied;

  await connectDB();
  const body = await req.json();
  const { name, provider } = body;
  if (!name || !provider) {
    return NextResponse.json({ success: false, message: "name and provider are required (e.g. provider: \"justdial\")" }, { status: 400 });
  }

  const connector = await (Connector as any).create({
    name,
    type: "lead_source",
    provider: String(provider).trim().toLowerCase(),
    status: "draft",
  });

  return NextResponse.json({ success: true, data: connector }, { status: 201 });
}
