import { NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Read-only connectivity check for the "Sync from YouTube" feature —
// verifies YOUTUBE_API_KEY + YOUTUBE_CHANNEL_ID actually resolve to a real
// channel and reports how much content is there, WITHOUT importing
// anything. Lets an admin confirm the key/channel are wired correctly
// before clicking Sync, and diagnose which of the two is missing/wrong if
// not — sync-youtube/route.ts's own error message only says "check
// YOUTUBE_CHANNEL_ID", this gives a live yes/no per credential.
export async function GET() {
  const denied = await requirePermission('videos', 'view');
  if (denied) return denied;

  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;

  if (!apiKey || !channelId) {
    return NextResponse.json({
      success: true,
      connected: false,
      hasApiKey: !!apiKey,
      hasChannelId: !!channelId,
      message: !apiKey && !channelId
        ? 'YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID are not set.'
        : !apiKey
          ? 'YOUTUBE_API_KEY is not set.'
          : 'YOUTUBE_CHANNEL_ID is not set.',
    });
  }

  try {
    // channels.list accepts either a raw channel ID (UC...) or, via
    // forHandle, an @handle — try id first (the common case, and the same
    // param sync-youtube/route.ts uses) and fall back to forHandle so a
    // handle saved into YOUTUBE_CHANNEL_ID by mistake still resolves.
    const idParam = channelId.startsWith('@') ? `forHandle=${encodeURIComponent(channelId)}` : `id=${encodeURIComponent(channelId)}`;
    const res = await fetch(
      `${YOUTUBE_API_BASE}/channels?part=snippet,contentDetails,statistics&${idParam}&key=${apiKey}`
    );
    const data = await res.json();

    if (data?.error) {
      return NextResponse.json({
        success: true,
        connected: false,
        hasApiKey: true,
        hasChannelId: true,
        message: data.error.message || 'YouTube API rejected the request — the key may be invalid, restricted, or over quota.',
      });
    }

    const channel = data?.items?.[0];
    if (!channel) {
      return NextResponse.json({
        success: true,
        connected: false,
        hasApiKey: true,
        hasChannelId: true,
        message: `No channel found for "${channelId}" — double-check the channel ID.`,
      });
    }

    return NextResponse.json({
      success: true,
      connected: true,
      hasApiKey: true,
      hasChannelId: true,
      channel: {
        id: channel.id,
        title: channel.snippet?.title || '',
        thumbnail: channel.snippet?.thumbnails?.default?.url || '',
        subscriberCount: channel.statistics?.subscriberCount ?? null,
        videoCount: channel.statistics?.videoCount ?? null,
      },
      message: `Connected to "${channel.snippet?.title}" — ${channel.statistics?.videoCount ?? '?'} videos on the channel (includes Shorts).`,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      connected: false,
      hasApiKey: true,
      hasChannelId: true,
      message: error?.message || 'Could not reach the YouTube API.',
    });
  }
}
