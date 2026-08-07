import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { BookingSuccessConfig, getBookingSuccessConfig } from '@/app/models/BookingSuccessConfig';
import { requirePermission } from '@/app/lib/adminAuth';

export async function GET() {
  const denied = await requirePermission('booking-success', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const config = await getBookingSuccessConfig();
    return NextResponse.json({ success: true, data: config });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch booking success config' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requirePermission('booking-success', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const { _id, createdAt, updatedAt, __v, ...body } = await req.json();
    const existing = await BookingSuccessConfig.findOne({} as any).lean();

    let updated;
    if (existing) {
      updated = await (BookingSuccessConfig as any).findByIdAndUpdate(
        (existing as any)._id,
        { $set: body },
        { returnDocument: 'after', runValidators: true }
      );
    } else {
      updated = await BookingSuccessConfig.create(body);
    }

    revalidateTag('booking-success-config');
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to save booking success config' }, { status: 500 });
  }
}
