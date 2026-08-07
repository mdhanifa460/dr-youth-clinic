import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/app/lib/cloudinary";
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from "@/app/lib/rateLimit";
import { connectDB } from "@/app/lib/mongodb";
import Booking from "@/app/models/Booking";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB — reports/scans can run larger than a phone photo
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

// Public, unauthenticated — same posture as assessment-photo-upload: a
// patient attaching a prior report from the Booking Success page's
// "Prepare for Your Consultation" checklist, before any account/auth
// system exists. Requires a real, already-created bookingId (not just any
// string) so this can't be used to pile up orphan uploads against nothing.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`booking-report-upload:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const bookingId = formData.get("bookingId") as string;

    if (!bookingId) {
      return NextResponse.json({ success: false, message: "bookingId is required" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, message: `Invalid file type. Allowed: JPG, PNG, WEBP, PDF` }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, message: "File size exceeds 8MB limit" }, { status: 400 });
    }

    await connectDB();
    const booking = await (Booking as any).findOne({ bookingId }).select("_id").lean();
    if (!booking) {
      return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const dataURI = `data:${file.type};base64,${base64}`;

    const result = await uploadImage(dataURI, "dr-youth-clinic/pre-visit-reports");

    await (Booking as any).updateOne(
      { bookingId },
      {
        $push: {
          preVisitReports: {
            url: result.secure_url,
            publicId: result.public_id,
            name: file.name.slice(0, 120),
            uploadedAt: new Date(),
          },
        },
      }
    );

    return NextResponse.json({ success: true, data: { url: result.secure_url, name: file.name } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Upload failed" }, { status: 500 });
  }
}
