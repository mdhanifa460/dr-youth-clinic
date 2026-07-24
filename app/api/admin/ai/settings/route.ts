import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Settings, getSettings } from '@/app/models/Settings';
import { requirePermission } from '@/app/lib/adminAuth';

// Scoped to the `ai` permission module rather than `settings` — the general
// /api/admin/settings route requires `settings:full`, which not every role
// with `ai:full` (e.g. marketing_manager, content_editor) also has. Only
// `ai`/`clinicProfile` are read/written here — never the full request body —
// so an ai-only admin can never use this endpoint to touch booking, brand,
// or analytics-ID settings that belong to the general Settings module.
export async function GET() {
  const denied = await requirePermission('ai', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const settings = await getSettings();
    return NextResponse.json({ success: true, data: { ai: settings.ai, clinicProfile: settings.clinicProfile } });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch AI settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requirePermission('ai', 'full');
  if (denied) return denied;

  try {
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    if (body.ai) patch.ai = body.ai;
    if (body.clinicProfile) patch.clinicProfile = body.clinicProfile;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ success: false, message: 'No ai/clinicProfile fields provided' }, { status: 400 });
    }

    await connectDB();
    const existing = await Settings.findOne({} as any);
    const updated = existing
      ? await (Settings as any).findByIdAndUpdate(existing._id, { $set: patch }, { new: true, runValidators: true })
      : await Settings.create(patch);

    return NextResponse.json({ success: true, data: { ai: updated.ai, clinicProfile: updated.clinicProfile } });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to save AI settings' }, { status: 500 });
  }
}
