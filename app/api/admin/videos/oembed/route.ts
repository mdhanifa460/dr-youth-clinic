import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';

// YouTube's public oEmbed endpoint — no API key, no quota, no Google Cloud
// project. Free-tier metadata (Level 1): title + channel name. It does NOT
// return duration or description (those stay manual-entry — see the Video
// module design notes), and its thumbnail is lower-res than the
// img.youtube.com/vi/{id}/hqdefault.jpg one already constructed elsewhere,
// so this route only forwards title/author_name.
export async function GET(req: NextRequest) {
  const denied = await requirePermission('videos', 'full');
  if (denied) return denied;

  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ success: false, message: 'url is required' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!res.ok) {
      return NextResponse.json({ success: false, message: 'Could not fetch video info — check the URL is a public YouTube video.' }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({
      success: true,
      data: { title: data.title || '', channel: data.author_name || '' },
    });
  } catch {
    return NextResponse.json({ success: false, message: 'Could not reach YouTube — try again.' }, { status: 502 });
  }
}
