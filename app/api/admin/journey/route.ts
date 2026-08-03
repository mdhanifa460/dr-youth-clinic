import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { JourneyConfig, getJourneyConfig } from '@/app/models/JourneyConfig';
import { requirePermission } from '@/app/lib/adminAuth';

export async function GET() {
  const denied = await requirePermission('journey', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const config = await getJourneyConfig();
    return NextResponse.json({ success: true, data: config });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch journey config' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requirePermission('journey', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const existing = await JourneyConfig.findOne({} as any).lean();

    let updated;
    if (existing) {
      updated = await (JourneyConfig as any).findByIdAndUpdate(existing._id, { $set: body }, { returnDocument: 'after', runValidators: true });
    } else {
      updated = await JourneyConfig.create(body);
    }

    revalidateTag('journey-config');
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to save journey config' }, { status: 500 });
  }
}
