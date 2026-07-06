import { connectDB } from "../../../lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import Booking from "../../../models/Booking";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
const denied = await requirePermission('bookings', 'view');
if (denied) return denied;

await connectDB();

const { searchParams } = new URL(req.url);

// 🔹 Query params
const page = Number(searchParams.get("page") || 1);
const limit = Number(searchParams.get("limit") || 6);
const status = searchParams.get("status");
const search = searchParams.get("search");
const date = searchParams.get("date");

const query: any = {};

// 🔍 Filters
if (status) query.status = status;
if (date) query.date = date;

if (search) {
query.$or = [
{ name: { $regex: search, $options: "i" } },
{ phone: { $regex: search, $options: "i" } },
];
}

// 📦 Fetch paginated data
const bookings = await Booking.find(query as any)
.sort({ createdAt: -1 })
.skip((page - 1) * limit)
.limit(limit);

// 🔢 Count total
const total = await Booking.countDocuments(query as any);

return NextResponse.json({
data: bookings,
total,
page,
totalPages: Math.ceil(total / limit),
});
}
