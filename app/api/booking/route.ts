import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { connectDB } from "../../lib/mongodb";
import { buildAttributionFields } from "@/app/lib/utmAttribution";
import { resolveOriginDomain } from "@/app/lib/migrationAttribution";
import Booking from "../../models/Booking";
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from "@/app/lib/rateLimit";
import { normalizePhone as formatPhone } from "@/app/lib/phone";
import { getClinicNotifyNumber } from "@/app/lib/clinicNotify";
import { bookingSchema } from "@/app/lib/validation";
import { sendWhatsAppText, sendWhatsAppTemplate } from "@/app/lib/whatsapp";
import { getEffectiveBranchConfig } from "@/app/lib/branchConfig";
import { getSiteConfig } from "@/app/lib/siteConfig";
import { pushBookingToCrm } from "@/app/lib/crm/pushBooking";
import { qualifyAndPersist } from "@/app/lib/leadQualification/persist";

export async function GET() {
  return NextResponse.json({ message: "API working ✅" });
}

export async function POST(req: NextRequest) {
  // 8 bookings per hour per IP — prevents spam while staying realistic for
  // genuine traffic: many Indian ISPs use carrier-grade NAT, so several
  // unrelated households can share one public IP, and a single household
  // booking for more than one family member (or retrying after a typo)
  // easily exceeds a lower cap. Was 3/hour — confirmed too tight when a
  // real patient hit it on a completely ordinary first attempt.
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`booking:${ip}`, 8, 60 * 60 * 1000);
  if (!rl.allowed) {
    const clinicPhone = (await getSiteConfig().catch(() => null))?.publicPhone;
    return tooManyRequestsResponse(
      rl.resetAt,
      `You've reached the booking limit for now.${clinicPhone ? ` Please call us directly at ${clinicPhone}` : ' Please try again shortly'} or try again in a little while.`
    );
  }

  try {
    const rawBody = await req.json();
    const parsed = bookingSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message || "Invalid booking details" },
        { status: 400 }
      );
    }
    const {
      name, phone, email, service, location, concern, promoCode, promoDiscount, source,
      doctorId, consultationMode, language, appointmentType, notes,
    } = parsed.data;
    // Not every entry point collects a slot (see bookingSchema) — fall back
    // to a placeholder for display/template purposes rather than sending a
    // blank line in the clinic's WhatsApp text or an empty template
    // parameter, which WhatsApp's template API rejects outright.
    const date = parsed.data.date || "To be scheduled";
    const time = parsed.data.time || "To be scheduled";

    const formattedPhone = formatPhone(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      return NextResponse.json({ success: false, message: "Invalid phone number" }, { status: 400 });
    }

    await connectDB();

    const bookingId = "DR-" + Date.now();

    // Detect if this phone has booked before
    const previousBookings = await (Booking as any).countDocuments({ phone: formattedPhone });
    const isReturnVisit = previousBookings > 0;

    const booking = await Booking.create({
      bookingId,
      name,
      phone: formattedPhone,
      formattedPhone,
      email: email || "",
      service,
      location,
      date,
      time,
      concern,
      source: source || "website",
      isReturnVisit,
      ...(doctorId ? { doctorId } : {}),
      ...(consultationMode ? { consultationMode } : {}),
      ...(language ? { language } : {}),
      ...(appointmentType ? { appointmentType } : {}),
      ...(notes ? { notes } : {}),
      ...(promoCode ? { promoCode, promoDiscount: promoDiscount ?? 0 } : {}),
      ...buildAttributionFields((name) => req.cookies.get(name)?.value),
      originDomain: resolveOriginDomain((name) => req.cookies.get(name)?.value),
    });

    // CRM Connector push — non-blocking. The booking is already saved
    // locally; whatever happens to the CRM sync after this never affects
    // the response the patient gets. No-ops silently if no CRM connector
    // is configured yet.
    pushBookingToCrm(booking).catch(() => {});

    // Lead Qualification Engine — scores this booking against the
    // admin-configured rules (Settings.leadQualification). No-ops silently
    // if the engine isn't enabled yet. Fire-and-forget, same as the CRM
    // push above — never lets a scoring hiccup affect the patient's
    // booking confirmation.
    qualifyAndPersist(booking, { reason: "auto:initial" }).catch(() => {});

    // Resolves this branch's outbound sender number, if one was configured
    // (LocationContent.clinicInfo.whatsappSenderPhoneNumberId) — falls back
    // to the global PHONE_NUMBER_ID otherwise, which is every branch today.
    const branchConfig = await getEffectiveBranchConfig(location).catch(() => null);
    const sendOpts = branchConfig?.whatsappSenderPhoneNumberId
      ? { senderPhoneNumberId: branchConfig.whatsappSenderPhoneNumberId }
      : undefined;

    // 1. Clinic staff alert (plain text — the clinic's own number, always
    // within the messaging window since it's the business's own account).
    const clinicNotifyNumber = await getClinicNotifyNumber(location);
    const clinicSend = await sendWhatsAppText(
      clinicNotifyNumber,
      `🆕 New Booking

ID: ${bookingId}
Name: ${name}
Phone: ${formattedPhone}
Service: ${service}
Location: ${location}
Date: ${date}
Time: ${time}
Concern: ${concern || "N/A"}${promoCode ? `\nPromo: ${promoCode} (${promoDiscount}% off)` : ""}`,
      sendOpts
    );
    if (!clinicSend.success) console.log("❌ Clinic WhatsApp alert failed:", clinicSend.error);

    // 2. Customer confirmation — must be a pre-approved template (the
    // patient hasn't messaged in, so plain text isn't deliverable). Failure
    // here must never turn an already-saved booking into a failure response
    // for the customer — sendWhatsAppTemplate never throws, only returns
    // { success: false }, which is exactly why it's safe to just log it.
    const customerSend = await sendWhatsAppTemplate(
      formattedPhone,
      "booking_confirmation_premium", // Meta-approved template name
      [name, location, service, date, time],
      "en", // must match the template's approved language exactly — not the patient's `language` preference field, which is a separate, unrelated concept
      sendOpts
    );
    if (!customerSend.success) console.log("❌ Customer WhatsApp confirmation failed:", customerSend.error);

    return NextResponse.json({
      success: true,
      bookingId,
    });

  } catch (err) {
    console.error("❌ Booking Error:", err);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
