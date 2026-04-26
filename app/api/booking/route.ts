import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { connectDB } from "../../lib/mongodb";
import Booking from "../../models/Booking";

export async function GET() {
    return NextResponse.json({ message: "API working ✅" });
}


export async function POST(req: Request) {
  try {
    const bookingId = `DR-${randomUUID().slice(0, 8).toUpperCase()}`;
    const body = await req.json();

    const { name, phone, service, location, date, time, concern } = body;

    if (!name || !phone || !date || !time) {
      return NextResponse.json(
        { success: false, message: "Missing fields" },
        { status: 400 }
      );
    }

    await connectDB();

    const booking = await Booking.create({
      bookingId,
      name,
      phone,
      service,
      location,
      date,
      time,
      concern,
      createdAt: new Date(),
    });

    const API_URL = `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`;

    // 👉 SEND TO CLINIC
    await fetch(API_URL, {
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

Name: ${name}
Phone: ${phone}
Service: ${service}
Location: ${location}
Date: ${date}
Time: ${time}
Concern: ${concern || "N/A"}`,
        },
      }),
    });

    // 👉 SEND TO CUSTOMER
    await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: {
          body: `Hi ${name}, your appointment is confirmed.

📍 ${location}
💼 ${service}
📅 ${date}
⏰ ${time}

See you soon ✨`,
        },
      }),
    });

    return NextResponse.json({
      success: true,
      bookingId,
      booking,
    });

  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
