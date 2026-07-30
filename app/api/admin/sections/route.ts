import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { Section, type SectionPageType } from '@/app/models/Section';
import { requirePermission } from '@/app/lib/adminAuth';
import type { AdminModule } from '@/app/lib/permissions';

// One shared endpoint across every page type the Content Layout Engine
// eventually covers — Service today, Blog/Landing/Home in later phases —
// rather than a duplicate CRUD route per page type.
const MODULE_FOR_PAGE_TYPE: Record<SectionPageType, AdminModule> = {
  service: 'services',
  blog: 'blog',
  landing: 'landing-pages',
  home: 'homepage',
  doctor: 'doctors',
  location: 'locations',
  offer: 'offers',
};

function moduleFor(pageType: string): AdminModule {
  return MODULE_FOR_PAGE_TYPE[pageType as SectionPageType] ?? 'services';
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pageType = searchParams.get('pageType');
  const pageId = searchParams.get('pageId');
  if (!pageType || !pageId) {
    return NextResponse.json({ success: false, message: 'pageType and pageId are required' }, { status: 400 });
  }

  const denied = await requirePermission(moduleFor(pageType), 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const sections = await Section.find({ pageType, pageId } as any).sort({ zone: 1, displayOrder: 1 });
    return NextResponse.json({ success: true, data: sections });
  } catch (error) {
    console.error('Error fetching sections:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch sections' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const denied = await requirePermission(moduleFor(body.pageType), 'full');
    if (denied) return denied;

    const count = await Section.countDocuments({ pageType: body.pageType, pageId: body.pageId, zone: body.zone } as any);

    const section = await Section.create({
      ...body,
      displayOrder: body.displayOrder ?? count,
    });

    revalidatePath('/', 'layout');
    return NextResponse.json({ success: true, data: section }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating section:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to create section' }, { status: 500 });
  }
}
