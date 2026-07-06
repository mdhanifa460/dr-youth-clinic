import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission, getAdminUser } from "@/app/lib/adminAuth";
import Booking from "@/app/models/Booking";
import { getSettings } from "@/app/models/Settings";
import { maskPhone } from "@/app/lib/phoneMask";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requirePermission("bookings", "view");
  if (denied) return denied;

  await connectDB();
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ data: [], total: 0 }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page     = Math.max(1, Number(searchParams.get("page")  || 1));
  const limit    = Math.min(50, Number(searchParams.get("limit") || 20));
  const status   = searchParams.get("status")   || "";
  const service  = searchParams.get("service")  || "";
  const location = searchParams.get("location") || "";
  const source   = searchParams.get("source")   || "";
  const search   = searchParams.get("search")   || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo   = searchParams.get("dateTo")   || "";
  const date     = searchParams.get("date")     || "";

  const query: Record<string, any> = {};

  // Branch restriction — users without "all" access see only their locations
  const branchRestricted = !user.assignedClinics.includes("all");
  if (branchRestricted) {
    query.location = { $in: user.assignedClinics };
  } else if (location) {
    query.location = { $regex: location, $options: "i" };
  }

  if (status)  query.status  = status;
  if (source)  query.source  = source;
  if (service) query.service = { $regex: service, $options: "i" };

  if (date) {
    query.date = date;
  } else if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo)   query.createdAt.$lte = new Date(dateTo + "T23:59:59.999Z");
  }

  if (search) {
    const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { name:  { $regex: safeSearch, $options: "i" } },
      { phone: { $regex: safeSearch, $options: "i" } },
      { email: { $regex: safeSearch, $options: "i" } },
    ];
  }

  const [rawData, total, settings] = await Promise.all([
    (Booking as any).find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    (Booking as any).countDocuments(query),
    getSettings(),
  ]);

  const allowedPhoneRoles: string[] = settings.contactPrivacy?.showPatientPhoneRoles
    ?? ["super_admin", "clinic_owner", "receptionist", "customer_support"];

  const data = rawData.map((b: any) => ({
    ...b,
    phone: maskPhone(b.phone || "", user.role, allowedPhoneRoles),
  }));

  return NextResponse.json({
    success: true,
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    branchRestricted,
  });
}
