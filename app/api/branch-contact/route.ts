import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { LocationContent } from "@/app/models/LocationContent";
import { getSettings } from "@/app/models/Settings";
import { locations } from "@/app/data/locations";

// Public, unauthenticated, read-only — same shape and reasoning as
// app/api/branch-whatsapp/route.ts: resolves the patient-facing
// address/phone for a specific branch, for client components that only
// learn the visitor's branch after mount (Footer's Contact Us column, via
// app/components/ContactInfo.tsx). Falls back to the sitewide
// Settings.contact.publicPhone whenever a branch hasn't set its own phone
// — same pattern branch-whatsapp already uses for its own number.
// Address has no sitewide fallback here (there's no single-address
// concept for a multi-branch clinic in this schema) — the caller passes
// its own admin-configured default for that case.
export async function GET(req: NextRequest) {
  const location = (req.nextUrl.searchParams.get("location") || "").toLowerCase();

  try {
    await connectDB();
    const settings = await getSettings();
    const sitewidePhone = settings.contact?.publicPhone || "";

    if (!Object.keys(locations).includes(location)) {
      return NextResponse.json({ success: true, data: { address: "", phone: sitewidePhone } });
    }

    const content = await (LocationContent as any)
      .findOne({ location })
      .select("clinicInfo.address clinicInfo.phone")
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        address: content?.clinicInfo?.address || "",
        phone: content?.clinicInfo?.phone || sitewidePhone,
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to resolve branch contact info" }, { status: 500 });
  }
}
