import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { getAdminUser } from "@/app/lib/adminAuth";
import Booking from "@/app/models/Booking";
import { LandingPageLead } from "@/app/models/LandingPageLead";
import { LandingPage } from "@/app/models/LandingPage";
import { normalizePhone } from "@/app/lib/phone";

export const dynamic = "force-dynamic";

// One-time migration: before this fix, every landing-page form submission
// saved into LandingPageLead — a collection with no admin UI at all — instead
// of Booking, the collection Lead Export/Booking Leads/Appointments actually
// read from. This backfills any pre-existing LandingPageLead records into
// real Booking documents so they finally show up in the pipeline staff use.
// Idempotent — safe to click more than once, matches app/api/lp/[slug]/lead
// route's field mapping so migrated leads look identical to new ones.
export async function POST() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });
  if (user.role !== "super_admin") {
    return NextResponse.json(
      { success: false, message: "Only a super admin can run this one-time migration." },
      { status: 403 }
    );
  }

  await connectDB();

  const stranded = await (LandingPageLead as any).find({}).sort({ createdAt: 1 }).lean();

  let migrated = 0;
  let skipped = 0;

  for (const lead of stranded) {
    const formattedPhone = normalizePhone(lead.phone || "");

    const already = await (Booking as any).findOne({
      phone: formattedPhone,
      lpSlug: lead.slug,
      createdAt: lead.createdAt,
    }).lean();
    if (already) {
      skipped++;
      continue;
    }

    const lp = await (LandingPage as any).findById(lead.lpId).select("title").lean();

    const extraFields = Object.entries(lead.fields || {}).filter(
      ([key]) => !["name", "full-name", "phone", "mobile", "tel", "email"].includes(key)
    );
    const notesBase = extraFields.length
      ? extraFields.map(([k, v]) => `${k}: ${v}`).join("\n") + "\n\n"
      : "";

    const previousBookings = await (Booking as any).countDocuments({ phone: formattedPhone });

    await Booking.create({
      bookingId: "DR-" + new Date(lead.createdAt).getTime(),
      name: lead.name || "",
      phone: formattedPhone,
      formattedPhone,
      email: lead.email || "",
      service: (lp as any)?.title || "Landing Page Enquiry",
      location: "",
      source: "landing-page",
      lpSlug: lead.slug,
      lpVariant: lead.variant || "A",
      notes: `${notesBase}(Migrated from a legacy landing-page lead capture, ${new Date(lead.createdAt).toISOString()})`,
      isReturnVisit: previousBookings > 0,
      createdAt: lead.createdAt,
      updatedAt: lead.createdAt,
    });
    migrated++;
  }

  return NextResponse.json({
    success: true,
    total: stranded.length,
    migrated,
    skipped,
  });
}
