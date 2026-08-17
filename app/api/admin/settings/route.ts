import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { Settings, getSettings } from '@/app/models/Settings';
import { requirePermission } from '@/app/lib/adminAuth';
import { extractSearchConsoleToken } from '@/app/lib/searchConsole';
import { mergeSettingsUpdate } from '@/app/lib/settingsMerge';
import { validateTrackingIds, type TrackingIdField } from '@/app/lib/analytics/validateTrackingIds';

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

    // GTM/GA4/Meta Pixel/Clarity/Hotjar IDs are pushed straight into a
    // live script tag on every public page (see app/layout.tsx) — unlike
    // searchConsoleId above, an obviously malformed value here isn't
    // silently corrected, it's rejected outright with a clear message, so
    // a stray typo can never get persisted and injected as-is. Scoped to
    // exactly these five fields; everything else in `body.analytics`
    // (gtmEnabled, gtmAuth, gtmPreview, …) passes through unchanged.
    if (body?.analytics) {
      const fieldsToCheck: TrackingIdField[] = ['gtmId', 'ga4Id', 'metaPixelId', 'clarityId', 'hotjarId'];
      const values: Partial<Record<TrackingIdField, string>> = {};
      for (const field of fieldsToCheck) {
        if (typeof body.analytics[field] === 'string') values[field] = body.analytics[field];
      }
      const { trimmed, errors } = validateTrackingIds(values);
      if (Object.keys(errors).length > 0) {
        return NextResponse.json(
          { success: false, message: Object.values(errors).join(' '), fieldErrors: errors },
          { status: 400 }
        );
      }
      Object.assign(body.analytics, trimmed);
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
