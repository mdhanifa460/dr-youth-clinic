import { NextResponse } from "next/server";
import { connectDB } from "../../lib/mongodb";
import Booking from "../../models/Booking";

export async function GET() {
  return NextResponse.json({ message: "API working ✅" });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("📥 RECEIVED IN API:", body);

    const { name, phone, service, location, date, time, concern } = body;


    const formattedPhone = formatPhone(phone);

    if (!name || !formattedPhone || !date || !time) {
      return NextResponse.json(
        { success: false, message: "Missing fields" },
        { status: 400 }
      );
    }

    await connectDB();

    // ✅ Generate bookingId per request
    const bookingId = "DR-" + Date.now();

    const booking = await Booking.create({
      bookingId,
      name,
      formattedPhone,
      service,
      location,
      date,
      time,
      concern,
      createdAt: new Date(),
    });

    const API_URL = `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`;

    // =========================
    // 🟢 1. SEND TO CLINIC (TEXT OK)
    // =========================
    const clinicRes = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: process.env.CLINIC_PHONE,
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
Concern: ${concern || "N/A"}`,
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