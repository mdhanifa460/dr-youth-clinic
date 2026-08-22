import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import { LeadSourceMapping } from "@/app/models/LeadSourceMapping";

export const dynamic = "force-dynamic";

// The branch-routing table itself — "this exact JustDial listing / this
// exact WhatsApp number belongs to this branch." See
// app/lib/leadSourceMapping/resolveBranch.ts for how it's read at
// ingestion time.
export async function GET() {
  const denied = await requirePermission("integrations", "view");
  if (denied) return denied;

  await connectDB();
  const mappings = await (LeadSourceMapping as any).find({}).sort({ source: 1, createdAt: -1 }).lean();
  return NextResponse.json({ success: true, data: mappings });
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission("integrations", "full");
  if (denied) return denied;

  await connectDB();
  const body = await req.json();
  const { label, source, branch, providerAccountId, providerPhone, whatsappPhoneNumberId, metadata } = body;

  if (!label || !source || !branch) {
    return NextResponse.json({ success: false, message: "label, source, and branch are required" }, { status: 400 });
  }
  // At least one real identifier — a mapping with none of these can never
  // actually match anything at resolve time, so it's worth catching here
  // rather than letting an admin save a mapping that silently does nothing.
  if (!providerAccountId && !providerPhone && !whatsappPhoneNumberId) {
    return NextResponse.json(
      { success: false, message: "At least one of providerAccountId, providerPhone, or whatsappPhoneNumberId is required — otherwise this mapping can never match an incoming lead." },
      { status: 400 }
    );
  }

  const mapping = await (LeadSourceMapping as any).create({
    label,
    source: String(source).trim().toLowerCase(),
    branch: String(branch).trim().toLowerCase(),
    providerAccountId: providerAccountId || "",
    providerPhone: providerPhone || "",
    whatsappPhoneNumberId: whatsappPhoneNumberId || "",
    metadata: metadata || {},
  });

  return NextResponse.json({ success: true, data: mapping }, { status: 201 });
}
