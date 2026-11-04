import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/app/lib/mongodb';
import { LandingPage } from '@/app/models/LandingPage';
import { getSettings } from '@/app/models/Settings';
import { getAdminUser, requirePermission } from '@/app/lib/adminAuth';
import { recordAdminActivity } from '@/app/lib/adminActivity';
import { planStatusChange, type BulkTargetStatus } from '@/app/lib/landingPages/bulkStatus';

export const dynamic = 'force-dynamic';

const MAX_PAGES = 200;

async function buildPlan(rawIds: unknown, status: unknown, skipRequiredCheck = false) {
  if (status !== 'published' && status !== 'draft') {
    return { error: 'status must be published or draft' };
  }
  if (!Array.isArray(rawIds) || rawIds.length === 0) return { error: 'Select at least one page' };
  if (rawIds.length > MAX_PAGES) return { error: `Select at most ${MAX_PAGES} pages at a time` };
  if (!rawIds.every((id) => typeof id === 'string' && mongoose.isValidObjectId(id))) {
    return { error: 'Invalid page selection' };
  }

  await connectDB();
  const [pages, settings] = await Promise.all([
    (LandingPage as any).find({ _id: { $in: rawIds } }).select('title slug status sections analytics').lean(),
    getSettings(),
  ]);
  const required = settings.landingPageForm?.requiredSections ?? [];
  return { target: status as BulkTargetStatus, plan: planStatusChange(pages, status, required, skipRequiredCheck) };
}

// Preview only: a GET so looking at what would happen changes nothing and adds
// nothing to the activity log.
export async function GET(req: NextRequest) {
  const denied = await requirePermission('landing-pages', 'full');
  if (denied) return denied;

  try {
    const ids = (req.nextUrl.searchParams.get('ids') ?? '').split(',').filter(Boolean);
    const result = await buildPlan(ids, req.nextUrl.searchParams.get('status'));
    if ('error' in result) return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    return NextResponse.json({ success: true, data: result.plan });
  } catch (error) {
    console.error('Error previewing bulk status change:', error);
    return NextResponse.json({ success: false, message: 'Failed to check these pages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission('landing-pages', 'full');
  if (denied) return denied;

  try {
    const { ids, status, undo } = await req.json();
    const result = await buildPlan(ids, status, undo === true);
    if ('error' in result) return NextResponse.json({ success: false, message: result.error }, { status: 400 });

    const { plan, target } = result;
    const readyIds = plan.ready.map((p) => p.id);
    if (readyIds.length > 0) {
      await (LandingPage as any).updateMany({ _id: { $in: readyIds } }, { $set: { status: target } });

      // Names the pages, which the generic request entry can't. The cap keeps
      // a big batch from truncating mid-word in the log.
      const me = await getAdminUser();
      if (me) {
        const verb = undo === true ? 'Undo, set to' : 'Set to';
        const names = plan.ready.slice(0, 20).map((p) => p.slug).join(', ');
        const more = plan.ready.length > 20 ? ` and ${plan.ready.length - 20} more` : '';
        await recordAdminActivity({
          actor: me,
          module: 'landing-pages',
          details: `${verb} ${target} (${plan.ready.length}): ${names}${more}`,
        });
      }
    }

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    console.error('Error applying bulk status change:', error);
    return NextResponse.json({ success: false, message: 'Failed to update these pages. Nothing was changed.' }, { status: 500 });
  }
}
