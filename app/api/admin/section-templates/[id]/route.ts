import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { SectionTemplate } from '@/app/models/SectionTemplate';
import { requirePermission } from '@/app/lib/adminAuth';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const existing = await (SectionTemplate as any).findById(params.id).lean();
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Template not found' }, { status: 404 });
    }

    const moduleMap: Record<string, any> = {
      'landing-page': 'landing-pages', homepage: 'homepage', about: 'homepage',
      'content-block-service': 'services', 'content-block-blog': 'blog',
    };
    const denied = await requirePermission(moduleMap[existing.sourceSystem] || 'landing-pages', 'full');
    if (denied) return denied;

    await (SectionTemplate as any).findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
