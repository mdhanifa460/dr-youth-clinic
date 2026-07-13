import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requirePermission } from '@/app/lib/adminAuth';
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { Doctor } from '@/app/models/Doctor';
import { Blog } from '@/app/models/Blog';
import { LocationContent } from '@/app/models/LocationContent';
import { Offer } from '@/app/models/Offer';
import { Video } from '@/app/models/Video';
import { HomepageSection } from '@/app/models/HomepageSection';
import { LandingPage } from '@/app/models/LandingPage';
import QuizConfig from '@/app/models/QuizConfig';
import { Lead } from '@/app/models/Lead';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ROOT_FOLDER = 'dr-youth-clinic';

// Fetches every asset under the app's Cloudinary folder, following
// next_cursor pagination rather than capping at one page — an incomplete
// scan here would wrongly flag a real, in-use image as missing from later
// pages if we only looked at the first 100-500 results.
async function fetchAllAssets() {
  const assets: any[] = [];
  let cursor: string | undefined;
  do {
    const result: any = await cloudinary.api.resources({
      type: 'upload',
      resource_type: 'image',
      prefix: ROOT_FOLDER,
      max_results: 500,
      next_cursor: cursor,
    });
    assets.push(...result.resources);
    cursor = result.next_cursor;
  } while (cursor);
  return assets;
}

// Whether every DB collection that can reference a Cloudinary image is
// checked. Some (HomepageSection, LandingPage) store arbitrary section data
// as Mixed/JSON with no fixed field path for images, so instead of trying to
// enumerate every nested path (and risk missing one — the exact mistake that
// would wrongly mark a used image as safe to delete), every collection is
// stringified and searched as plain text for the publicId. Simple, and it
// can't miss a field the way a hand-picked list of paths could.
async function buildUsedTextBlob(): Promise<string> {
  await connectDB();
  const [services, doctors, blogs, locations, offers, videos, homepageSections, landingPages, quizConfigs, leads] =
    await Promise.all([
      Service.find().lean(),
      Doctor.find().lean(),
      Blog.find().lean(),
      LocationContent.find().lean(),
      Offer.find().lean(),
      Video.find().lean(),
      HomepageSection.find().lean(),
      LandingPage.find().lean(),
      // QuizConfig (question/answer .image fields) and Lead (patient-uploaded
      // assessment photos, answers.<photoQuestionId>) were both added after
      // this scan was built and never wired in — every image referenced only
      // from the AI Assessment was invisible here and wrongly flagged unused.
      (QuizConfig as any).find().lean(),
      (Lead as any).find().lean(),
    ]);
  return JSON.stringify([
    services, doctors, blogs, locations, offers, videos, homepageSections, landingPages, quizConfigs, leads,
  ]);
}

export async function GET(req: NextRequest) {
  const denied = await requirePermission('services', 'view');
  if (denied) return denied;

  try {
    const [assets, usedBlob] = await Promise.all([fetchAllAssets(), buildUsedTextBlob()]);

    // Group by etag (Cloudinary's MD5 of the file) to find byte-identical
    // duplicates — this won't catch re-compressed/resized copies of the
    // same photo, only exact re-uploads of the same file.
    const etagGroups = new Map<string, string[]>();
    // Second, looser signal: same width + height + byte size. This app's
    // upload flow doesn't preserve original filenames (no use_filename on
    // upload, so Cloudinary assigns a random public_id) and no perceptual/
    // visual hashing is set up, so exact dimensions+size is the strongest
    // "likely the same photo, re-uploaded through a different path" signal
    // available without adding new upload-time metadata or a hashing service.
    const dimensionGroups = new Map<string, string[]>();
    for (const a of assets) {
      if (a.etag) {
        const list = etagGroups.get(a.etag) ?? [];
        list.push(a.public_id);
        etagGroups.set(a.etag, list);
      }
      if (a.width && a.height && a.bytes) {
        const key = `${a.width}x${a.height}:${a.bytes}`;
        const list = dimensionGroups.get(key) ?? [];
        list.push(a.public_id);
        dimensionGroups.set(key, list);
      }
    }

    const now = Date.now();
    const images = assets.map((a: any) => {
      const exactGroup = a.etag ? etagGroups.get(a.etag) : undefined;
      const dimensionKey = a.width && a.height && a.bytes ? `${a.width}x${a.height}:${a.bytes}` : undefined;
      const looseGroup = dimensionKey ? dimensionGroups.get(dimensionKey) : undefined;
      // Don't double-report a pair that's already an exact match as a
      // separate "possible" duplicate too.
      const possibleGroup = looseGroup && looseGroup.length > 1 && (!exactGroup || looseGroup.length > exactGroup.length) ? looseGroup : undefined;
      const ageInDays = Math.floor((now - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return {
        publicId: a.public_id,
        url: a.secure_url,
        width: a.width,
        height: a.height,
        bytes: a.bytes,
        createdAt: a.created_at,
        ageInDays,
        isUsed: usedBlob.includes(a.public_id),
        duplicateCount: exactGroup ? exactGroup.length : 1,
        duplicateGroup: exactGroup && exactGroup.length > 1 ? a.etag : null,
        possibleDuplicateCount: possibleGroup ? possibleGroup.length : 1,
        possibleDuplicateGroup: possibleGroup ? dimensionKey : null,
      };
    });

    images.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ success: true, images });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
