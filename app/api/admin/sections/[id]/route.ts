import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { sectionsTagFor } from '@/app/lib/layoutEngine/sectionsCache';
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

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await connectDB();
    const existing = await (Section as any).findById(params.id);
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Section not found' }, { status: 404 });
    }

    const denied = await requirePermission(MODULE_FOR_PAGE_TYPE[existing.pageType] ?? 'services', 'full');
    if (denied) return denied;

    const body = await req.json();
    const section = await (Section as any).findByIdAndUpdate(params.id, body, {
      returnDocument: 'after',
      runValidators: true,
    });

    revalidateTag(sectionsTagFor(existing.pageType));
    if (section?.pageType && section.pageType !== existing.pageType) revalidateTag(sectionsTagFor(section.pageType));
    return NextResponse.json({ success: true, data: section });
  } catch (error: any) {
    console.error('Error updating section:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to update section' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await connectDB();
    const existing = await (Section as any).findById(params.id);
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Section not found' }, { status: 404 });
    }

    const denied = await requirePermission(MODULE_FOR_PAGE_TYPE[existing.pageType] ?? 'services', 'full');
    if (denied) return denied;

    await (Section as any).findByIdAndDelete(params.id);
    revalidateTag(sectionsTagFor(existing.pageType));
    return NextResponse.json({ success: true, message: 'Section deleted' });
  } catch (error) {
    console.error('Error deleting section:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete section' }, { status: 500 });
  }
}
