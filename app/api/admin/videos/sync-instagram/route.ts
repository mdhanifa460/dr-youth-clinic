import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { Video } from '@/app/models/Video';
import { requirePermission } from '@/app/lib/adminAuth';
import { uploadImage } from '@/app/lib/cloudinary';

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';
// Same reasoning as sync-youtube's MAX_PLAYLIST_PAGES — bounds how many
// pages of the account's media one sync click will page through (25
// items/page here, Instagram's default), so a very large back catalog
// can't turn one click into an unbounded number of Graph API calls.
// A second click picks up where dedupe left off.
const MAX_MEDIA_PAGES = 10;

interface IgMediaItem {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_product_type?: 'FEED' | 'REELS' | 'STORY' | 'AD';
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
}

export async function POST() {
  const denied = await requirePermission('videos', 'full');
  if (denied) return denied;

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!accessToken || !igUserId) {
    return NextResponse.json(
      { success: false, message: 'INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID must be set to sync.' },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    // Page through the account's media collecting every VIDEO/REELS item —
    // IMAGE and CAROUSEL_ALBUM posts are skipped (this is a video library;
    // an admin can still add a specific carousel video manually if needed).
    const items: IgMediaItem[] = [];
    let url =
      `${GRAPH_API_BASE}/${igUserId}/media?fields=id,caption,media_type,media_product_type,permalink,thumbnail_url,timestamp` +
      `&limit=50&access_token=${accessToken}`;

    for (let page = 0; page < MAX_MEDIA_PAGES && url; page++) {
      const res = await fetch(url);
      const data = await res.json();
      if (data?.error) {
        return NextResponse.json({ success: false, message: data.error.message || 'Instagram API error' }, { status: 502 });
      }
      for (const item of data?.data || []) {
        if (item.media_type === 'VIDEO') items.push(item);
      }
      url = data?.paging?.next || '';
    }

    if (items.length === 0) {
      return NextResponse.json({ success: true, added: 0, skipped: 0, message: 'No Reels/videos found on this account.' });
    }

    // Dedupe against what's already in the library, same pattern as
    // sync-youtube's youtubeId check.
    const existing = await (Video as any)
      .find({ instagramMediaId: { $in: items.map((i) => i.id) } })
      .select('instagramMediaId')
      .lean();
    const existingIds = new Set((existing as any[]).map((v) => v.instagramMediaId));
    const newItems = items.filter((i) => !existingIds.has(i.id));

    if (newItems.length === 0) {
      return NextResponse.json({ success: true, added: 0, skipped: items.length, message: 'No new Reels/videos — already up to date.' });
    }

    const created: string[] = [];
    for (const item of newItems) {
      // Instagram's thumbnail_url is a short-lived, signed CDN link (unlike
      // YouTube's stable img.youtube.com pattern) — it has to be rehosted
      // on Cloudinary at sync time or the thumbnail breaks once the signed
      // URL expires. A failed rehost skips just the thumbnail for this one
      // item (left for the reviewer to fill in), not the whole sync.
      let thumbnail: { url: string; publicId: string } | undefined;
      if (item.thumbnail_url) {
        try {
          const uploaded = await uploadImage(item.thumbnail_url, 'dr-youth-clinic/videos');
          thumbnail = { url: uploaded.secure_url, publicId: uploaded.public_id };
        } catch (e) {
          console.error('[sync-instagram] thumbnail rehost failed', item.id, e);
        }
      }

      const video = new Video({
        title: (item.caption || 'Untitled Reel').split('\n')[0].slice(0, 100),
        instagramUrl: item.permalink,
        instagramMediaId: item.id,
        platform: 'instagram',
        format: item.media_product_type === 'REELS' ? 'reel' : 'video',
        syncedFromApi: true,
        status: 'draft',
        channel: '',
        ...(thumbnail ? { thumbnail } : {}),
      });
      await video.save();
      created.push(video.id);
    }

    revalidateTag('videos');
    return NextResponse.json({
      success: true,
      added: created.length,
      skipped: items.length - created.length,
      message: `Added ${created.length} new Reel${created.length === 1 ? '' : 's'}/video${created.length === 1 ? '' : 's'} as drafts.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Sync failed' }, { status: 500 });
  }
}
