import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { HomepageSection } from '@/app/models/HomepageSection';
import { HOMEPAGE_DEFAULTS } from '@/app/lib/homepageDefaults';
import { normalizeLegacyImageUrls } from '@/app/lib/legacyImageUrls';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();

    const sections = await HomepageSection.find({} as any).sort({ order: 1 }).lean();

    if (sections.length === 0) {
      // Seed defaults on first access
      const defaults = Object.entries(HOMEPAGE_DEFAULTS).map(([key, val]) => ({
        sectionKey: key,
        label: val.label,
        order: val.order,
        visible: val.visible,
        data: val.data,
      }));
      await HomepageSection.insertMany(defaults as any, { ordered: false }).catch(() => {});
      return NextResponse.json({
        success: true,
        sections: normalizeLegacyImageUrls(defaults),
      });
    }

    return NextResponse.json({
      success: true,
      sections: normalizeLegacyImageUrls(sections),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
