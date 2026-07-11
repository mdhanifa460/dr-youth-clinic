import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Offer } from '@/app/models/Offer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const offers = await (Offer as any)
      .find({
        active: true,
        $or: [{ validUntil: null }, { validUntil: { $gte: new Date() } }],
      })
      .sort({ order: 1, createdAt: -1 })
      .lean();
    return NextResponse.json({ success: true, data: offers });
  } catch {
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
