import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/app/lib/cloudinary";
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from "@/app/lib/rateLimit";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Public, unauthenticated — a visitor optionally attaches a photo of their
// skin/hair while taking the AI Assessment, for the doctor to review later.
// Kept in its own Cloudinary folder (not admin's "results" gallery) since
// this is visitor-submitted, potentially sensitive biometric imagery.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`assessment-photo-upload:${ip}`, 8, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, message: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, message: "File size exceeds 5MB limit" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const dataURI = `data:${file.type};base64,${base64}`;

    const result = await uploadImage(dataURI, "dr-youth-clinic/assessment-photos");

    return NextResponse.json({ success: true, data: { secure_url: result.secure_url, public_id: result.public_id } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Upload failed" }, { status: 500 });
  }
}
