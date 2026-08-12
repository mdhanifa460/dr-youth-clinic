import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { Settings, getSettings } from '@/app/models/Settings';
import { requirePermission } from '@/app/lib/adminAuth';
import { extractSearchConsoleToken } from '@/app/lib/searchConsole';
import { mergeSettingsUpdate } from '@/app/lib/settingsMerge';

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

    // Search Console verification is meant to be token-only (see
    // app/lib/searchConsole.ts) — an admin pasting Search Console's own
    // full <meta ...> tag instead of just the content="..." value has
    // already happened once in production. Sanitized here, not just
    // documented in the field's help text, so it can't happen again
    // regardless of what actually gets pasted. Scoped to this one field
    // only — every other settings field passes through unchanged.
    if (body?.analytics && typeof body.analytics.searchConsoleId === 'string') {
      body.analytics.searchConsoleId = extractSearchConsoleToken(body.analytics.searchConsoleId);
    }

    const existing = await Settings.findOne({} as any).lean();

    let updated;
    if (existing) {
      const mergedBody = mergeSettingsUpdate(existing, body);
      updated = await (Settings as any).findByIdAndUpdate(existing._id, { $set: mergedBody }, { returnDocument: 'after', runValidators: true });
    } else {
      updated = await Settings.create(body);
    }

    revalidateTag('settings');
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to save settings' }, { status: 500 });
  }
}
