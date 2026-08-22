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
import { checkIpRisk } from "@/app/lib/ipIntelligence";
import { checkBookingCapacity, isRealAppointment } from "@/app/lib/bookingCapacity";
import { normalizeIdempotencyKey, extractIdentity, identitiesMatch, createBookingIdempotent } from "@/app/lib/bookingIdempotency";

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

    // Idempotency — a client-generated key naming ONE logical submission
    // attempt (see app/lib/useIdempotencyKey.ts for how the frontend
    // derives/reuses it). This upfront check happens BEFORE the capacity
    // gate deliberately: a replay of an already-processed request must
    // never re-run capacity (a retry must not consume a second slot) and
    // must never re-run the WhatsApp alerts/CRM push below — it just
    // returns the original result. Missing/malformed key degrades safely
    // to today's exact behavior (see normalizeIdempotencyKey) — never a
    // 500, never a hard requirement.
    const idempotencyKey = normalizeIdempotencyKey(req.headers.get("idempotency-key"));
    if (idempotencyKey) {
      const preExisting = await (Booking as any).findOne({ idempotencyKey }).lean();
      if (preExisting) {
        // Reuses the SAME `date`/`time` (with the "To be scheduled"
        // fallback already applied above) that actually gets persisted —
        // comparing against `parsed.data.date || ""` here instead was a
        // real bug: it would mismatch every stored booking that has no
        // date/time (a callback-only submission, e.g. ConsultationFormBar),
        // since the persisted record always has "To be scheduled" while
        // this recomputed it as "". A same-key, same-details retry of
        // exactly that kind of booking incorrectly 409'd as a false
        // conflict instead of replaying cleanly.
        const incomingIdentity = extractIdentity({ name, phone: formattedPhone, service, location, date, time });
        if (!identitiesMatch(extractIdentity(preExisting), incomingIdentity)) {
          return NextResponse.json(
            { success: false, code: "IDEMPOTENCY_CONFLICT", message: "This booking request has already been processed." },
            { status: 409 }
          );
        }
        // Same key, same booking details — a legitimate retry (e.g. the
        // first response never reached the browser). Return the ORIGINAL
        // result as a normal success, exactly as if this were the first
        // time — never a second "duplicate booking" error for the patient.
        // alreadyProcessed:true tells the client this is a replay, not a
        // new booking, so trackBookingConversion() skips booking_completed
        // instead of double-firing the GA4/GTM conversion for one booking.
        // The attribution fields below are read off the ORIGINAL booking's
        // own persisted record, not re-derived from today's cookies.
        return NextResponse.json({
          success: true,
          bookingId: preExisting.bookingId,
          alreadyProcessed: true,
          source: preExisting.source || undefined,
          medium: preExisting.utmMedium || undefined,
          campaign: preExisting.utmCampaign || undefined,
          sourceAccount: preExisting.sourceAccount || undefined,
        });
      }
    }

    // Booking Capacity & Availability — a business-capacity policy, NOT
    // the anti-abuse rate limiter above (that stays untouched). Only
    // relevant when this submission actually names a real appointment
    // slot — a callback request or a flow with no date/time step (see
    // bookingSchema) was never a capacity-consuming appointment and must
    // not be gated by it. Runs BEFORE creation, so a rejected request
    // never reaches the database — see app/lib/bookingCapacity.ts. Only
    // reached when no pre-existing idempotent booking was found above, so
    // a retry can never consume a second capacity slot.
    if (isRealAppointment(parsed.data.date, parsed.data.time)) {
      const capacity = await checkBookingCapacity({ branch: location, date: parsed.data.date!, time: parsed.data.time! });
      if (!capacity.allowed) {
        return NextResponse.json(
          {
            success: false,
            code: capacity.code,
            message: capacity.message,
            sameDayRequestAvailable: capacity.sameDayRequestAvailable,
            nextAvailableDate: capacity.nextAvailableDate,
          },
          { status: 409 }
        );
      }
    }

    const bookingId = "DR-" + Date.now();

    // Detect if this phone has booked before
    const previousBookings = await (Booking as any).countDocuments({ phone: formattedPhone });
    const isReturnVisit = previousBookings > 0;

    const attribution = buildAttributionFields((name) => req.cookies.get(name)?.value);

    // The fix for "everything shows as source=website" (Marketing
    // Attribution, Phase 2): `source` now holds the visitor's real
    // ACQUISITION source (google/direct/facebook/...) rather than always
    // "website" — that's what `conversionChannel` below is for. Priority:
    // an explicit `source` in the request body always wins (nothing sends
    // one today, but this is a deliberate escape hatch for any future
    // caller that does); otherwise the last-touch UTM/click-id-derived
    // source (already resolved by middleware — see utmAttribution.ts,
    // covers organic search and click-ID-only visits too); otherwise
    // "direct" — the standard "no referrer, no campaign" bucket, matching
    // GA4's own "(direct)" convention, never a guess dressed up as data.
    const resolvedSource = source || attribution.utmSource || "direct";

    const fieldsToSet = {
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
      source: resolvedSource,
      // HOW this booking converted — always "website" for this route (the
      // one thing this route always knows for certain), independent of
      // whatever `source` above resolved to. See Booking.ts's
      // conversionChannel comment.
      conversionChannel: "website",
      // Reuses the EXISTING visitor_id cookie (middleware.ts) — no second
      // identity system. Empty string if the visitor has no cookie yet
      // (e.g. a very first request that middleware hasn't touched), same
      // "absent = not yet known" convention as everything else here.
      attributionId: req.cookies.get("visitor_id")?.value || "",
      isReturnVisit,
      ...(doctorId ? { doctorId } : {}),
      ...(consultationMode ? { consultationMode } : {}),
      ...(language ? { language } : {}),
      ...(appointmentType ? { appointmentType } : {}),
      ...(notes ? { notes } : {}),
      ...(promoCode ? { promoCode, promoDiscount: promoDiscount ?? 0 } : {}),
      ...attribution,
      originDomain: resolveOriginDomain((name) => req.cookies.get(name)?.value),
    };

    // Atomic create-or-replay — resolves the one remaining race window
    // (two requests carrying the SAME key, both passing the upfront check
    // above at nearly the same instant). See app/lib/bookingIdempotency.ts.
    const result = await createBookingIdempotent(Booking, idempotencyKey, fieldsToSet);
    if (result.status === "conflict") {
      return NextResponse.json(
        { success: false, code: "IDEMPOTENCY_CONFLICT", message: "This booking request has already been processed." },
        { status: 409 }
      );
    }
    const booking = result.booking;

    // Everything below — CRM push, lead qualification, VPN flag, WhatsApp
    // alerts — only runs for a GENUINE new creation. A "replayed" result
    // (the narrow concurrent-duplicate-key race, resolved above) must
    // never re-trigger any of these a second time for the same booking.
    if (result.status === "created") {
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

      // VPN/proxy/datacenter risk flag — a staff-visible signal, never a
      // submission gate (see app/lib/ipIntelligence.ts). Same fire-and-
      // forget pattern as CRM/qualification above: the lookup can be slow
      // or fail outright, and neither should ever delay or break the
      // patient's booking confirmation.
      checkIpRisk(ip).then((r) => {
        if (r.checked) (Booking as any).updateOne({ _id: booking._id }, { $set: { ipRiskFlagged: r.isVpnOrProxy } }).catch(() => {});
      }).catch(() => {});

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
    }

    // alreadyProcessed:false only for a genuine first-time creation — a
    // "replayed" result here is the narrow concurrent-same-key race
    // (resolved atomically in createBookingIdempotent), same intent as the
    // upfront replay branch above: the client must not fire
    // booking_completed twice for one real booking. source/medium/campaign/
    // sourceAccount are read straight off the persisted booking — already
    // computed above as `fieldsToSet`/`resolvedSource`, not recomputed.
    return NextResponse.json({
      success: true,
      bookingId: booking.bookingId,
      alreadyProcessed: result.status !== "created",
      source: booking.source || undefined,
      medium: booking.utmMedium || undefined,
      campaign: booking.utmCampaign || undefined,
      sourceAccount: booking.sourceAccount || undefined,
    });

  } catch (err) {
    console.error("❌ Booking Error:", err);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
