import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { LocationContent } from '@/app/models/LocationContent';

// Public GET — only returns visible content
export async function GET(_: NextRequest, { params }: { params: { city: string } }) {
  try {
    await connectDB();
    const city = params.city.toLowerCase();

    const doc = await LocationContent.findOne({ location: city } as any).lean();

    if (!doc) {
      return NextResponse.json({ success: true, data: null });
    }

    // Filter to only visible items
    return NextResponse.json({
      success: true,
      data: {
        heroImage: doc.heroImage,
        beforeAfterPairs: doc.beforeAfterPairs.filter((p) => p.isVisible),
        galleryImages: doc.galleryImages
          .filter((g) => g.isVisible)
          .sort((a, b) => a.displayOrder - b.displayOrder),
        localDoctors: doc.localDoctors.filter((d) => d.isVisible),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
