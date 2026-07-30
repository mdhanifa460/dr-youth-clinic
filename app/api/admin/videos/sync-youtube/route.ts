import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { Video } from '@/app/models/Video';
import { requirePermission } from '@/app/lib/adminAuth';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
// Hard cap on how many uploads-playlist pages one sync click will page
// through (50 videos/page) — bounds API quota use per click on channels
// with a very large back catalog. A second click picks up where dedupe
// left off, since already-synced videos are skipped every time.
const MAX_PLAYLIST_PAGES = 10;

function isoDurationToMinSec(iso: string): string {
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return '';
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}.${String(s).padStart(2, '0')}`;
}

function durationToSeconds(iso: string): number {
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

export async function POST() {
  const denied = await requirePermission('videos', 'full');
  if (denied) return denied;

  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) {
    return NextResponse.json(
      { success: false, message: 'YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID must be set to sync.' },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const channelRes = await fetch(
      `${YOUTUBE_API_BASE}/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
    );
    const channelData = await channelRes.json();
    const uploadsPlaylistId = channelData?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      return NextResponse.json(
        { success: false, message: channelData?.error?.message || 'Could not resolve the channel\'s uploads playlist — check YOUTUBE_CHANNEL_ID.' },
        { status: 400 }
      );
    }

    // Page through the uploads playlist collecting every video ID.
    const allVideoIds: string[] = [];
    let pageToken = '';
    for (let page = 0; page < MAX_PLAYLIST_PAGES; page++) {
      const playlistRes = await fetch(
        `${YOUTUBE_API_BASE}/playlistItems?part=snippet&maxResults=50&playlistId=${uploadsPlaylistId}&key=${apiKey}` +
          (pageToken ? `&pageToken=${pageToken}` : '')
      );
      const playlistData = await playlistRes.json();
      if (playlistData?.error) {
        return NextResponse.json({ success: false, message: playlistData.error.message || 'YouTube API error' }, { status: 502 });
      }
      for (const item of playlistData?.items || []) {
        const id = item?.snippet?.resourceId?.videoId;
        if (id) allVideoIds.push(id);
      }
      pageToken = playlistData?.nextPageToken || '';
      if (!pageToken) break;
    }

    if (allVideoIds.length === 0) {
      return NextResponse.json({ success: true, added: 0, skipped: 0, message: 'No videos found on this channel.' });
    }

    // Dedupe against what's already in the library — the same job run
    // twice in a row should only ever add what's genuinely new.
    const existing = await (Video as any).find({ youtubeId: { $in: allVideoIds } }).select('youtubeId').lean();
    const existingIds = new Set((existing as any[]).map((v) => v.youtubeId));
    const newIds = allVideoIds.filter((id) => !existingIds.has(id));

    if (newIds.length === 0) {
      return NextResponse.json({ success: true, added: 0, skipped: allVideoIds.length, message: 'No new videos — already up to date.' });
    }

    // videos.list accepts at most 50 IDs per call.
    const created: string[] = [];
    for (let i = 0; i < newIds.length; i += 50) {
      const batch = newIds.slice(i, i + 50);
      const detailsRes = await fetch(
        `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails&id=${batch.join(',')}&key=${apiKey}`
      );
      const detailsData = await detailsRes.json();
      if (detailsData?.error) {
        return NextResponse.json({ success: false, message: detailsData.error.message || 'YouTube API error' }, { status: 502 });
      }

      for (const item of detailsData?.items || []) {
        const videoId = item.id;
        const durationIso = item?.contentDetails?.duration || '';
        const seconds = durationToSeconds(durationIso);
        // A /shorts/ URL (vs. /watch?v=) is what Video.ts's own pre-save
        // hook (detectFormat) uses to set format — encoding the duration
        // heuristic into the URL shape here reuses that single source of
        // truth instead of setting `format` directly and risking the hook
        // silently overwriting it on save (it re-derives format from the
        // URL whenever youtubeUrl is modified, which it always is on create).
        const url = seconds > 0 && seconds <= 60
          ? `https://www.youtube.com/shorts/${videoId}`
          : `https://www.youtube.com/watch?v=${videoId}`;

        const video = new Video({
          title: item?.snippet?.title || 'Untitled',
          youtubeUrl: url,
          platform: 'youtube',
          syncedFromApi: true,
          duration: durationIso ? isoDurationToMinSec(durationIso) : '',
          status: 'draft',
          channel: item?.snippet?.channelTitle || '',
        });
        await video.save();
        created.push(video.id);
      }
    }

    revalidateTag('videos');
    return NextResponse.json({
      success: true,
      added: created.length,
      skipped: allVideoIds.length - created.length,
      message: `Added ${created.length} new video${created.length === 1 ? '' : 's'} as drafts.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Sync failed' }, { status: 500 });
  }
}
