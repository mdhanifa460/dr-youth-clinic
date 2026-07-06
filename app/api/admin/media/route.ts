import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requirePermission } from '@/app/lib/adminAuth';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const denied = await requirePermission('services', 'view');
  if (denied) return denied;

  try {
    const folder = req.nextUrl.searchParams.get('folder') ?? 'dr-youth-clinic';
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder,
      max_results: 100,
      resource_type: 'image',
    });
    const images = (result.resources as any[])
      .map((r) => ({
        publicId:  r.public_id,
        url:       r.secure_url,
        width:     r.width,
        height:    r.height,
        bytes:     r.bytes,
        createdAt: r.created_at,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json({ success: true, images });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

const ALLOWED_PREFIX = 'dr-youth-clinic/';

export async function DELETE(req: NextRequest) {
  const denied = await requirePermission('services', 'full');
  if (denied) return denied;

  try {
    const { publicId } = await req.json();
    if (!publicId) {
      return NextResponse.json({ success: false, message: 'publicId is required' }, { status: 400 });
    }
    if (!publicId.startsWith(ALLOWED_PREFIX)) {
      return NextResponse.json({ success: false, message: 'publicId is outside allowed folder scope' }, { status: 403 });
    }
    const result = await cloudinary.uploader.destroy(publicId);
    return NextResponse.json({ success: result.result === 'ok' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
