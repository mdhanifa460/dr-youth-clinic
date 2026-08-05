import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { LocationContent } from "@/app/models/LocationContent";
import { getSettings } from "@/app/models/Settings";
import { locations } from "@/app/data/locations";

// Public, unauthenticated, read-only — resolves the patient-facing
// WhatsApp number for a specific branch, for client components that only
// learn the visitor's branch after mount (TopBar/Footer/AiChatWidget read
// it from the same preferred_location cookie/URL-segment detection
// Navbar.tsx already uses — see useBranchWhatsApp in
// app/lib/useBranchWhatsApp.ts). Falls back to the sitewide
// Settings.contact.publicWhatsApp whenever the branch hasn't set its own
// number, so an unconfigured location never breaks the link.
export async function GET(req: NextRequest) {
  const location = (req.nextUrl.searchParams.get("location") || "").toLowerCase();

  try {
    await connectDB();
    const settings = await getSettings();
    const sitewideFallback = settings.contact?.publicWhatsApp || "";

    if (!Object.keys(locations).includes(location)) {
      return NextResponse.json({ success: true, data: { whatsapp: sitewideFallback } });
    }

    const content = await (LocationContent as any)
      .findOne({ location })
      .select("clinicInfo.publicWhatsApp")
      .lean();

    const branchNumber = content?.clinicInfo?.publicWhatsApp || "";
    return NextResponse.json({ success: true, data: { whatsapp: branchNumber || sitewideFallback } });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to resolve WhatsApp number" }, { status: 500 });
  }
}
