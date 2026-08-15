import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { connectDB } from "@/app/lib/mongodb";
import { CustomAnalyticsEvent } from "@/app/models/CustomAnalyticsEvent";
import { requirePermission, getAdminUser } from "@/app/lib/adminAuth";
import { validateCustomEventName } from "@/app/lib/analytics/validateCustomEventName";
import { validateParamNames } from "@/app/lib/analytics/piiBlocklist";

export async function GET(_req: NextRequest) {
  const denied = await requirePermission("analytics", "view");
  if (denied) return denied;

  try {
    await connectDB();
    const events = await (CustomAnalyticsEvent as any).find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: events });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to fetch custom events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission("analytics", "full");
  if (denied) return denied;

  try {
    await connectDB();
    const user = await getAdminUser();
    const body = await req.json();

    // Format + protected-registry-collision check, shared with the unit
    // tests via validateCustomEventName() — reject clearly rather than
    // silently letting two different things share one dataLayer event name.
    const nameCheck = validateCustomEventName(String(body.name || ""));
    if (!nameCheck.valid) {
      return NextResponse.json({ success: false, message: nameCheck.reason }, { status: 400 });
    }

    const paramNames: string[] = Array.isArray(body.parameters) ? body.parameters.map((p: any) => p?.name || "") : [];
    const piiViolation = validateParamNames(paramNames);
    if (piiViolation) {
      return NextResponse.json({ success: false, message: piiViolation.reason }, { status: 400 });
    }

    const event = await CustomAnalyticsEvent.create({
      ...body,
      createdBy: user?.email || "",
      updatedBy: user?.email || "",
    });
    revalidateTag("custom-analytics-events");
    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: "An event with this name already exists." }, { status: 400 });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(", ") }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Failed to create custom event" }, { status: 500 });
  }
}
