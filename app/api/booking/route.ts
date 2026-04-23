import { NextResponse } from "next/server";
import { connectDB } from "../../lib/mongodb";
import Booking from "../../models/Booking";


const bookingId = "DR-" + Date.now();

export async function GET() {
    return NextResponse.json({ message: "API working ✅" });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const { name, phone, service, location, date, time, concern } = body;

        // 🟢 BASIC VALIDATION
        if (!name || !phone || !service || !location || !date || !time) {
            return NextResponse.json(
                { success: false, message: "Missing required fields" },
                { status: 400 }
            );
        }

        await connectDB();

        // 🟢 SAVE TO DB
        const booking = await Booking.create({
            bookingId,
            name,
            phone,
            service,
            location,
            date,
            time,
            concern,
        });

        const API_URL = `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`;

        // 🟢 SEND TO CLINIC (SAFE)
        try {
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

            const clinicData = await clinicRes.json();
            console.log("Clinic WhatsApp:", clinicData);
        } catch (err) {
            console.error("Clinic WhatsApp failed:", err);
        }

        // 🟢 SEND TO CUSTOMER (SAFE)
        try {
            const userRes = await fetch(API_URL, {
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
                        body: `Hi ${name}, your appointment is confirmed at DR Youth Clinic.

📍 ${location}
💼 ${service}
📅 ${date}
⏰ ${time}

See you soon ✨`,
                    },
                }),
            });

            const userData = await userRes.json();
            console.log("Customer WhatsApp:", userData);
        } catch (err) {
            console.error("Customer WhatsApp failed:", err);
        }

        return NextResponse.json({
            success: true,
            bookingId,
        });

    } catch (error) {
        console.error("API ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Something went wrong",
            },
            { status: 500 }
        );
    }
}