import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requirePermission } from '@/app/lib/adminAuth';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Issues a short-lived signature for a DIRECT browser → Cloudinary upload —
// no file bytes ever pass through this route or through Vercel's function
// runtime at all. Every other upload in this codebase (VideoUpload,
// ImageUpload) proxies the raw file through a Next.js API route as a
// base64 data URI, which works for small images but silently caps out at
// whatever this deployment's actual request-body limit is — a 10MB video
// was rejected with a platform-level "Request Entity Too Large" (plain
// text, not JSON, hence the client's "Unexpected token" parse error)
// despite the upload UI itself promising up to 50MB. Signing here and
// uploading directly to Cloudinary from the browser removes that ceiling
// entirely — Cloudinary's own limits are far higher than anything this
// admin panel needs.
export async function POST(req: NextRequest) {
  const denied = await requirePermission('services', 'full');
  if (denied) return denied;

  if (!process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_API_KEY) {
    return NextResponse.json({ success: false, message: 'Cloudinary is not configured' }, { status: 500 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const folder = typeof body.folder === 'string' && body.folder ? body.folder : 'dr-youth-clinic/videos';
    const timestamp = Math.round(Date.now() / 1000);

    // Every param included here MUST also be sent (as-is) in the actual
    // upload request below, or Cloudinary rejects the signature as invalid.
    const paramsToSign = { folder, timestamp };
    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);

    return NextResponse.json({
      success: true,
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      folder,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Could not sign upload' }, { status: 500 });
  }
}
