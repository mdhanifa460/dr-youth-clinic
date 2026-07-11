import { NextResponse } from "next/server";
import { connectDB } from "../../lib/mongodb";
import Booking from "../../models/Booking";
import { LocationContent } from "../../models/LocationContent";
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from "@/app/lib/rateLimit";

// Resolves which WhatsApp number gets the "new booking" alert for a given
// location: per-location whatsappNotifyNumber -> per-location public phone
// -> global CLINIC_PHONE fallback, so locations without a configured number
// still work exactly as before.
async function getClinicNotifyNumber(location: string): Promise<string | undefined> {
  try {
    const lc = await (LocationContent as any)
      .findOne({ location: (location || "").toLowerCase() })
      .select("clinicInfo.phone clinicInfo.whatsappNotifyNumber")
      .lean();
    const raw = lc?.clinicInfo?.whatsappNotifyNumber || lc?.clinicInfo?.phone;
    return raw ? formatPhone(raw) : process.env.CLINIC_PHONE;
  } catch {
    return process.env.CLINIC_PHONE;
  }
}

export async function GET() {
  return NextResponse.json({ message: "API working ✅" });
}

export async function POST(req: Request) {
  // 3 bookings per hour per IP — prevent spam
  const ip = getClientIp(req);
  const rl = checkRateLimit(`booking:${ip}`, 3, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    const body = await req.json();
    const { name, phone, email, service, location, date, time, concern, promoCode, promoDiscount, source } = body;

    // Input validation
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json({ success: false, message: "Valid name is required" }, { status: 400 });
    }
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ success: false, message: "Phone number is required" }, { status: 400 });
    }
    if (!date || !time) {
      return NextResponse.json({ success: false, message: "Date and time are required" }, { status: 400 });
    }

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
      ...(promoCode ? { promoCode, promoDiscount: promoDiscount ?? 0 } : {}),
    });

    const API_URL = `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`;

    // =========================
    // 🟢 1. SEND TO CLINIC (TEXT OK)
    // =========================
    const clinicNotifyNumber = await getClinicNotifyNumber(location);
    const clinicRes = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: clinicNotifyNumber,
        type: "text",
        text: {
          body: `🆕 New Booking

ID: ${bookingId}
Name: ${name}
Phone: ${formattedPhone}
Service: ${service}
Location: ${location}
Date: ${date}
Time: ${time}
Concern: ${concern || "N/A"}${promoCode ? `\nPromo: ${promoCode} (${promoDiscount}% off)` : ""}`,
        },
      }),
    });

    let clinicData;
    try {
      const clinicText = await clinicRes.text();
      clinicData = JSON.parse(clinicText);
    } catch {
      console.log("❌ Not JSON response (HTML error)");
    }
    // =========================
    // 🟢 2. SEND TO CUSTOMER (TEMPLATE REQUIRED)
    // =========================
    const customerRes = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formattedPhone, // must be 91XXXXXXXXXX
        type: "template",
        template: {
          name: "booking_confirmation_premium", // ✅ your template
          language: { code: "en" }, // ⚠️ match Meta exactly (en or en_US)

          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: name },
                { type: "text", text: location },
                { type: "text", text: service },
                { type: "text", text: date },
                { type: "text", text: time },
              ],
            },
          ],
        },
      }),
    });

    const customerData = await customerRes.json();
    console.log("📲 Customer WA:", customerData);

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

function formatPhone(phone: string) {
  // remove spaces, +, etc.
  let cleaned = phone.replace(/\D/g, "");

  // remove leading 0
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  // add 91 if not present
  if (!cleaned.startsWith("91")) {
    cleaned = "91" + cleaned;
  }

  return cleaned;
}
