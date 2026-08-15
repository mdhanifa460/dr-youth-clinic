import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { connectDB } from "@/app/lib/mongodb";
import { CustomAnalyticsEvent } from "@/app/models/CustomAnalyticsEvent";
import { requirePermission, getAdminUser } from "@/app/lib/adminAuth";
import { validateParamNames } from "@/app/lib/analytics/piiBlocklist";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("analytics", "view");
  if (denied) return denied;

  try {
    await connectDB();
    const event = await (CustomAnalyticsEvent as any).findById(params.id).lean();
    if (!event) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: event });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to fetch custom event" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("analytics", "full");
  if (denied) return denied;

  try {
    await connectDB();
    const user = await getAdminUser();
    const body = await req.json();

    // Event name is immutable after creation — a rename would silently
    // orphan any GTM trigger already built against the old name. Stripped
    // here regardless of what the client sends, not just hidden in the UI.
    delete body.name;

    if (Array.isArray(body.parameters)) {
      const paramNames = body.parameters.map((p: any) => p?.name || "");
      const piiViolation = validateParamNames(paramNames);
      if (piiViolation) {
        return NextResponse.json({ success: false, message: piiViolation.reason }, { status: 400 });
      }
    }

    const event = await (CustomAnalyticsEvent as any).findById(params.id);
    if (!event) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    Object.assign(event, body, { updatedBy: user?.email || event.updatedBy });
    await event.save();
    revalidateTag("custom-analytics-events");

    return NextResponse.json({ success: true, data: event });
  } catch (error: any) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(", ") }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Failed to update custom event" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("analytics", "full");
  if (denied) return denied;

  try {
    await connectDB();
    const event = await (CustomAnalyticsEvent as any).findByIdAndDelete(params.id);
    if (!event) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    revalidateTag("custom-analytics-events");
    return NextResponse.json({ success: true, message: "Custom event deleted" });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to delete custom event" }, { status: 500 });
  }
}
