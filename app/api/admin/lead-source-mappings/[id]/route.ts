import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import { LeadSourceMapping } from "@/app/models/LeadSourceMapping";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("integrations", "full");
  if (denied) return denied;

  await connectDB();
  const body = await req.json();
  const patch: Record<string, unknown> = {};
  for (const key of ["label", "source", "branch", "providerAccountId", "providerPhone", "whatsappPhoneNumberId", "active", "metadata"]) {
    if (key in body) patch[key] = body[key];
  }
  if (typeof patch.source === "string") patch.source = (patch.source as string).trim().toLowerCase();
  if (typeof patch.branch === "string") patch.branch = (patch.branch as string).trim().toLowerCase();

  const mapping = await (LeadSourceMapping as any).findByIdAndUpdate(params.id, { $set: patch }, { new: true });
  if (!mapping) return NextResponse.json({ success: false, message: "Mapping not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: mapping });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("integrations", "full");
  if (denied) return denied;

  await connectDB();
  const mapping = await (LeadSourceMapping as any).findByIdAndDelete(params.id);
  if (!mapping) return NextResponse.json({ success: false, message: "Mapping not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
