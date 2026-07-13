import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { SectionTemplate } from '@/app/models/SectionTemplate';
import { requirePermission } from '@/app/lib/adminAuth';
import type { AdminModule } from '@/app/lib/permissions';

// Templates are shared across 3 different editors, each gated by its own
// module — 'about' has no dedicated module (it's stored inside
// HomepageSection with no /admin/about entry in the module map at all
// today), so it's checked against 'homepage' as the closest existing one.
const MODULE_BY_SYSTEM: Record<string, AdminModule> = {
  'landing-page': 'landing-pages',
  homepage: 'homepage',
  about: 'homepage',
  'content-block-service': 'services',
  'content-block-blog': 'blog',
};

function moduleFor(sourceSystem: string | null): AdminModule {
  return MODULE_BY_SYSTEM[sourceSystem || ''] || 'landing-pages';
}

export async function GET(req: NextRequest) {
  const sourceSystem = req.nextUrl.searchParams.get('sourceSystem');
  const denied = await requirePermission(moduleFor(sourceSystem), 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const filter = sourceSystem ? { sourceSystem } : {};
    const templates = await (SectionTemplate as any).find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: templates });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, type, icon, data, sourceSystem } = body;
    if (!name || !type || !sourceSystem) {
      return NextResponse.json({ success: false, message: 'name, type, and sourceSystem are required' }, { status: 400 });
    }

    const denied = await requirePermission(moduleFor(sourceSystem), 'full');
    if (denied) return denied;

    const template = await SectionTemplate.create({ name, type, icon: icon || '', data: data || {}, sourceSystem });
    return NextResponse.json({ success: true, data: template });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
