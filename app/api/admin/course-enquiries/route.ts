import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import { CourseEnquiry } from "@/app/models/CourseEnquiry";
// Registers Course with Mongoose for the .populate() call below.
import "@/app/models/Course";

export async function GET(req: NextRequest) {
  const denied = await requirePermission("courses", "view");
  if (denied) return denied;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(50, Number(searchParams.get("limit") || 20));
  const status = searchParams.get("status");
  const query: Record<string, any> = {};
  if (status) query.status = status;

  const [data, total] = await Promise.all([
    (CourseEnquiry as any)
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("course", "title slug")
      .lean(),
    (CourseEnquiry as any).countDocuments(query),
  ]);

  return NextResponse.json({
    success: true,
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function PATCH(req: NextRequest) {
  const denied = await requirePermission("courses", "full");
  if (denied) return denied;

  try {
    await connectDB();
    const { enquiryId, status } = await req.json();
    if (!enquiryId || !status) {
      return NextResponse.json({ success: false, message: "enquiryId and status are required" }, { status: 400 });
    }
    const enquiry = await (CourseEnquiry as any).findByIdAndUpdate(
      enquiryId,
      { $set: { status } },
      { returnDocument: 'after', runValidators: true }
    );
    if (!enquiry) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: enquiry });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Failed to update enquiry" }, { status: 500 });
  }
}
