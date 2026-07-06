import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission, getAdminUser } from "@/app/lib/adminAuth";
import DoctorSlotBlock from "@/app/models/DoctorSlotBlock";
import { SLOT_BLOCK_ROLES } from "@/app/lib/appointmentFlow";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("bookings", "full");
  if (denied) return denied;

  await connectDB();
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  if (!SLOT_BLOCK_ROLES.includes(user.role)) {
    return NextResponse.json({ success: false, message: "Not permitted." }, { status: 403 });
  }

  const block = await (DoctorSlotBlock as any).findById(params.id).lean() as any;
  if (!block) return NextResponse.json({ success: false, message: "Not found." }, { status: 404 });

  // Doctors can only delete their own blocks
  if (user.role === "doctor") {
    const linkedId = (user as any).linkedDoctorId;
    if (String(block.doctorId) !== String(linkedId)) {
      return NextResponse.json({ success: false, message: "You can only remove your own blocks." }, { status: 403 });
    }
  }

  await (DoctorSlotBlock as any).findByIdAndDelete(params.id);
  return NextResponse.json({ success: true });
}
