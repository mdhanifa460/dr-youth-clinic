import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Settings } from '@/app/models/Settings';
import { getAdminUser } from '@/app/lib/adminAuth';
import { PHONE_MASK_TOGGLE_ROLES } from '@/app/lib/permissions';

export async function PUT(req: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });
  if (!PHONE_MASK_TOGGLE_ROLES.includes(user.role)) {
    return NextResponse.json({ success: false, message: 'Forbidden: insufficient permissions' }, { status: 403 });
  }

  try {
    await connectDB();
    const { enabled } = await req.json();
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ success: false, message: 'enabled must be a boolean' }, { status: 400 });
    }

    // Atomic upsert on the single nested field — avoids both a duplicate-document
    // race on first write (no doc yet) and clobbering sibling contactPrivacy fields.
    const updated = await (Settings as any).findOneAndUpdate(
      {},
      { $set: { 'contactPrivacy.phoneMaskEnabled': enabled } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, data: updated.contactPrivacy });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to save' }, { status: 500 });
  }
}
