import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission, getAdminUser } from "@/app/lib/adminAuth";
import { Lead } from "@/app/models/Lead";
import { getSettings } from "@/app/models/Settings";
import { maskPhone } from "@/app/lib/phoneMask";

// Individual AI Assessment leads for doctor/staff review — previously only
// aggregate numbers existed (Analytics tab); a doctor had no way to open a
// specific visitor's answers, gender/age, or uploaded photo before this.
export async function GET(req: NextRequest) {
  const denied = await requirePermission("ai-assessment", "view");
  if (denied) return denied;

  await connectDB();

  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(50, Number(searchParams.get("limit") || 20));

  const [rawData, total, settings] = await Promise.all([
    (Lead as any).find({}).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    (Lead as any).countDocuments({}),
    getSettings(),
  ]);

  const allowedPhoneRoles: string[] = settings.contactPrivacy?.showPatientPhoneRoles ?? ["super_admin", "clinic_owner", "receptionist", "customer_support"];
  const phoneMaskEnabled = settings.contactPrivacy?.phoneMaskEnabled ?? true;
  const data = rawData.map((lead: any) => ({
    ...lead,
    phone: maskPhone(lead.phone || "", user.role, allowedPhoneRoles, phoneMaskEnabled),
  }));

  return NextResponse.json({
    success: true,
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
