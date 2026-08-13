import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { Video, VIDEO_CATEGORIES } from '@/app/models/Video';
import { getSettings } from '@/app/models/Settings';
import { requirePermission } from '@/app/lib/adminAuth';
import { generateText, isConfiguredProviderReady } from '@/app/lib/ai';
import { parseClaudeJson } from '@/app/lib/ai/anthropic';

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

// Titles per AI classification call — deliberately smaller than the 50-item
// YouTube API batch above. Tested live at 50: the model's JSON response for
// a full 50-entry array got cut off mid-array by the token cap, which
// broke parseClaudeJson and silently zeroed out the category for the
// *entire* 50-video batch (confirmed: a real sync produced exactly 50
// blank categories out of 87, i.e. every video in the first outer batch
// and none in the second, smaller one). Chunking classification
// independently of the YouTube-side batch size — plus a generous token
// budget per chunk — keeps each response comfortably short.
const CLASSIFY_CHUNK_SIZE = 20;

async function classifyChunk(titles: string[]): Promise<Array<string | undefined>> {
  const fallback = titles.map(() => undefined);
  if (titles.length === 0) return fallback;

  const prompt = `You are categorizing a dermatology/hair clinic's YouTube video library for its website admin.

Available categories (choose exactly one per video, using this exact spelling):
${VIDEO_CATEGORIES.join(', ')}

Videos (in order):
${titles.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

Return ONLY valid JSON, no explanation, no markdown:
{"categories": [${titles.map(() => '"..."').join(', ')}]}
The categories array must have exactly ${titles.length} entries, in the same order as the videos above, each one of the exact category names listed.`;

  try {
    const raw = await generateText(prompt, { maxTokens: 1500 });
    const parsed = parseClaudeJson<{ categories: string[] }>(raw);
    if (!Array.isArray(parsed.categories) || parsed.categories.length !== titles.length) {
      return fallback;
    }
    const valid = new Set<string>(VIDEO_CATEGORIES as unknown as string[]);
    return parsed.categories.map((c) => (valid.has(c) ? c : undefined));
  } catch {
    // Classification is a nice-to-have, not a requirement — any failure
    // here (rate limit, malformed/truncated response, provider down) just
    // leaves category blank for this chunk, exactly like before this
    // existed. Never lets a classification problem fail the actual sync.
    return fallback;
  }
}

// Best-effort AI category guess for a batch of freshly-synced titles.
// Returns an array the same length as `titles`, entries undefined wherever
// the guess is missing/invalid. Every video stays in Draft regardless —
// this only saves the admin from hand-picking a category on the obvious
// ones, it never publishes anything itself.
async function classifyCategories(titles: string[]): Promise<Array<string | undefined>> {
  const results: Array<string | undefined> = [];
  for (let i = 0; i < titles.length; i += CLASSIFY_CHUNK_SIZE) {
    const chunk = titles.slice(i, i + CLASSIFY_CHUNK_SIZE);
    results.push(...(await classifyChunk(chunk)));
  }
  return results;
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

    const settings = await getSettings();
    // Schema default (true) only applies to a *new* Settings document —
    // this app's Settings singleton already existed before this field was
    // added, so on a document that predates it, `autoCategorizeEnabled` is
    // read back as undefined, not true. Treat "off" as only the explicit
    // `false` an admin saves from the toggle, so this defaults to enabled
    // for that pre-existing document too, exactly as the default is meant
    // to (confirmed against a real Settings doc during testing — GET
    // /api/admin/settings omits the key entirely until saved once).
    const autoCategorize = settings.videoAI?.autoCategorizeEnabled !== false && isConfiguredProviderReady();

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
    const failed: Array<{ title: string; message: string }> = [];
    for (let i = 0; i < newIds.length; i += 50) {
      const batch = newIds.slice(i, i + 50);
      const detailsRes = await fetch(
        `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails&id=${batch.join(',')}&key=${apiKey}`
      );
      const detailsData = await detailsRes.json();
      if (detailsData?.error) {
        return NextResponse.json({ success: false, message: detailsData.error.message || 'YouTube API error' }, { status: 502 });
      }

      const batchItems = detailsData?.items || [];
      const categories = autoCategorize
        ? await classifyCategories(batchItems.map((item: any) => item?.snippet?.title || 'Untitled'))
        : batchItems.map(() => undefined);

      for (let idx = 0; idx < batchItems.length; idx++) {
        const item = batchItems[idx];
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
          // Best-effort AI guess (see classifyCategories) — undefined
          // (left blank, same as before this existed) if auto-categorize is
          // off, the provider isn't configured, or this particular guess
          // came back invalid. Always still a Draft either way.
          category: categories[idx],
        });
        // Per-video try/catch — one bad save (a validation error, a rare
        // slug collision, etc.) used to throw past this loop entirely and
        // abort the rest of the batch, silently dropping every video after
        // it even though nothing was wrong with them. Now a single failure
        // is recorded and the sync keeps going through the rest of the
        // channel's uploads.
        try {
          await video.save();
          created.push(video.id);
        } catch (err: any) {
          failed.push({ title: video.title, message: err?.message || 'Unknown error' });
        }
      }
    }

    revalidateTag('videos');
    const failedNote = failed.length > 0
      ? ` ${failed.length} failed: ${failed.slice(0, 3).map((f) => `"${f.title}" (${f.message})`).join('; ')}${failed.length > 3 ? '…' : ''}`
      : '';
    return NextResponse.json({
      success: true,
      added: created.length,
      skipped: allVideoIds.length - created.length - failed.length,
      failed: failed.length,
      message: `Added ${created.length} new video${created.length === 1 ? '' : 's'} as drafts${autoCategorize ? ' (categories AI-guessed — please review)' : ''}.${failedNote}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Sync failed' }, { status: 500 });
  }
}
