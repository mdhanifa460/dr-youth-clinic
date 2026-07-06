import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { HomepageSection } from '@/app/models/HomepageSection';
import { HOMEPAGE_DEFAULTS } from '@/app/lib/homepageDefaults';
import { normalizeLegacyImageUrls } from '@/app/lib/legacyImageUrls';
import { requirePermission } from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requirePermission('homepage', 'view');
  if (denied) return denied;

  try {
    await connectDB();

    let sections = await HomepageSection.find({} as any).sort({ order: 1 }).lean();

    if (sections.length === 0) {
      const defaults = Object.entries(HOMEPAGE_DEFAULTS).map(([key, val]) => ({
        sectionKey: key,
        label: val.label,
        order: val.order,
        visible: val.visible,
        data: val.data,
      }));
      await HomepageSection.insertMany(defaults as any, { ordered: false }).catch(() => {});
      sections = await HomepageSection.find({} as any).sort({ order: 1 }).lean();
    }

    return NextResponse.json({
      success: true,
      sections: normalizeLegacyImageUrls(sections),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requirePermission('homepage', 'full');
  if (denied) return denied;

  try {
    await connectDB();

    const { sections } = await req.json();

    if (!Array.isArray(sections)) {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
    }

    const normalizedSections = normalizeLegacyImageUrls(sections);

    const ops = normalizedSections.map((s: any) => ({
      updateOne: {
        filter: { sectionKey: s.sectionKey },
        update: {
          $set: {
            label: s.label,
            order: s.order,
            visible: s.visible,
            data: s.data,
          },
        },
        upsert: true,
      },
    }));

    await (HomepageSection as any).bulkWrite(ops);
    revalidateTag('homepage-layout');

    return NextResponse.json({ success: true, message: 'Homepage saved successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
