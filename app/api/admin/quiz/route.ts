import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import QuizConfig, { DEFAULT_QUIZ_CONFIG } from "@/app/models/QuizConfig";
import { requirePermission } from "@/app/lib/adminAuth";
import { revalidateTag } from "next/cache";

export async function GET() {
  const denied = await requirePermission("services", "view");
  if (denied) return denied;

  try {
    await connectDB();
    const config = await (QuizConfig as any).findOne({}).lean();
    return NextResponse.json({ success: true, data: config ?? DEFAULT_QUIZ_CONFIG });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to load quiz config" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requirePermission("services", "full");
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const config = await (QuizConfig as any).findOneAndUpdate(
      {},
      { $set: body },
      { new: true, upsert: true, runValidators: true }
    ).lean();
    revalidateTag("quiz-config");
    return NextResponse.json({ success: true, data: config });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Failed to save" }, { status: 500 });
  }
}
