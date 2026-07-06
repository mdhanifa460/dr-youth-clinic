import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { getAdminUser, requirePermission } from "@/app/lib/adminAuth";
import NotificationQueue from "@/app/models/NotificationQueue";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("bookings", "full");
  if (denied) return denied;

  await connectDB();
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  await (NotificationQueue as any).findByIdAndUpdate(params.id, {
    $set: {
      manuallyConfirmed:   true,
      manuallyConfirmedBy: user._id,
      manuallyConfirmedAt: new Date(),
      status:              "sent",
      sentAt:              new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
