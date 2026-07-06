import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { LocationContent } from '@/app/models/LocationContent';
import { requirePermission } from '@/app/lib/adminAuth';

const VALID_CITIES = new Set(['chennai', 'bangalore', 'coimbatore', 'kochi']);

// GET — fetch content for one city (creates empty doc if it doesn't exist yet)
export async function GET(_: NextRequest, { params }: { params: { city: string } }) {
  const denied = await requirePermission('locations', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const city = params.city.toLowerCase();
    if (!VALID_CITIES.has(city)) return NextResponse.json({ success: false, message: 'Invalid city' }, { status: 400 });

    // findOneAndUpdate with upsert so admin always gets a doc even on first visit
    const doc = await (LocationContent as any).findOneAndUpdate(
      { location: city },
      { $setOnInsert: { location: city } },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ success: true, data: doc });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// PUT — full replace of location content
export async function PUT(req: NextRequest, { params }: { params: { city: string } }) {
  const denied = await requirePermission('locations', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const city = params.city.toLowerCase();
    if (!VALID_CITIES.has(city)) return NextResponse.json({ success: false, message: 'Invalid city' }, { status: 400 });
    const body = await req.json();

    const update: Record<string, any> = {};

    if (body.heroImage !== undefined)        update.heroImage = body.heroImage;
    if (body.googleMapsUrl !== undefined)    update.googleMapsUrl = body.googleMapsUrl;
    if (body.mapEmbedUrl !== undefined)      update.mapEmbedUrl = body.mapEmbedUrl;
    if (body.clinicInfo !== undefined)       update.clinicInfo = body.clinicInfo;
    if (body.beforeAfterPairs !== undefined) update.beforeAfterPairs = body.beforeAfterPairs;
    if (body.galleryImages !== undefined)    update.galleryImages = body.galleryImages;
    if (body.localDoctors !== undefined)     update.localDoctors = body.localDoctors;

    const doc = await (LocationContent as any).findOneAndUpdate(
      { location: city },
      { $set: update },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ success: true, data: doc });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
