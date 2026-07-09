import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Settings, getSettings } from '@/app/models/Settings';
import { getAdminUser } from '@/app/lib/adminAuth';

// Narrower than the generic settings 'full' permission (super_admin only) — this one
// toggle is also editable by clinic_owner, per an explicit product decision, without
// widening clinic_owner's access to the rest of Settings.
const ALLOWED_ROLES = ['super_admin', 'clinic_owner'];

export async function PUT(req: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });
  if (!ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ success: false, message: 'Forbidden: insufficient permissions' }, { status: 403 });
  }

  try {
    await connectDB();
    const { enabled } = await req.json();
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ success: false, message: 'enabled must be a boolean' }, { status: 400 });
    }

    const existing = await Settings.findOne({} as any);
    const contactPrivacy = { ...(existing?.contactPrivacy ?? (await getSettings()).contactPrivacy), phoneMaskEnabled: enabled };

    const updated = existing
      ? await (Settings as any).findByIdAndUpdate(existing._id, { $set: { contactPrivacy } }, { new: true, runValidators: true })
      : await Settings.create({ contactPrivacy });

    return NextResponse.json({ success: true, data: updated.contactPrivacy });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to save' }, { status: 500 });
  }
}
