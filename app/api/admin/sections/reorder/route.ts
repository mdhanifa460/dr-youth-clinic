import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { Section } from '@/app/models/Section';
import { requirePermission } from '@/app/lib/adminAuth';
import type { AdminModule } from '@/app/lib/permissions';

const MODULE_FOR_PAGE_TYPE: Record<string, AdminModule> = {
  service: 'services',
  blog: 'blog',
  landing: 'landing-pages',
  home: 'homepage',
  doctor: 'doctors',
  location: 'locations',
  offer: 'offers',
};

// Body: { pageType, orderedIds: string[] } — orderedIds is the new
// top-to-bottom order for one zone's drag-reorder in the Section Builder.
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { pageType, orderedIds } = body as { pageType: string; orderedIds: string[] };

    const denied = await requirePermission(MODULE_FOR_PAGE_TYPE[pageType] ?? 'services', 'full');
    if (denied) return denied;

    await connectDB();
    await Promise.all(
      orderedIds.map((id, index) =>
        (Section as any).findByIdAndUpdate(id, { displayOrder: index })
      )
    );

    revalidatePath('/', 'layout');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering sections:', error);
    return NextResponse.json({ success: false, message: 'Failed to reorder sections' }, { status: 500 });
  }
}
