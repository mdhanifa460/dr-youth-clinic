import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Settings, getSettings } from '@/app/models/Settings';
import { requirePermission } from '@/app/lib/adminAuth';

export async function GET() {
  const denied = await requirePermission('settings', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const settings = await getSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requirePermission('settings', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const existing = await Settings.findOne({} as any);

    let updated;
    if (existing) {
      updated = await (Settings as any).findByIdAndUpdate(existing._id, { $set: body }, { new: true, runValidators: true });
    } else {
      updated = await Settings.create(body);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to save settings' }, { status: 500 });
  }
}
