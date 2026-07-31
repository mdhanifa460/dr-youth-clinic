import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';
import type { AdminModule } from '@/app/lib/permissions';
import { SECTION_REGISTRY } from '@/app/lib/layoutEngine/registry';

const MODULE_FOR_PAGE_TYPE: Record<string, AdminModule> = {
  service: 'services',
  blog: 'blog',
  landing: 'landing-pages',
  home: 'homepage',
  doctor: 'doctors',
  location: 'locations',
  offer: 'offers',
};

// Registry entries carry real leaf components (some Server Components with
// no 'use client'), so the admin builder — a client bundle — never imports
// registry.ts directly. This route runs server-side, imports the registry
// once, and returns only the plain, JSON-serializable catalog metadata the
// "Add Section" picker needs.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pageType = searchParams.get('pageType');
  if (!pageType) {
    return NextResponse.json({ success: false, message: 'pageType is required' }, { status: 400 });
  }

  const denied = await requirePermission(MODULE_FOR_PAGE_TYPE[pageType] ?? 'services', 'view');
  if (denied) return denied;

  const catalog = SECTION_REGISTRY
    .filter((e) => e.allowedPageTypes.includes(pageType as any))
    .map((e) => ({
      sectionType: e.sectionType,
      variant: e.variant,
      label: e.label,
      icon: e.icon,
      allowedZones: e.allowedZones,
      singleton: !!e.singleton,
    }));

  return NextResponse.json({ success: true, data: catalog });
}
