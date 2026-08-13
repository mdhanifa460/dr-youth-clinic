// Instagram's public embed iframe takes /p/{shortcode}/embed or
// /reel/{shortcode}/embed — both forms work for either a feed video or a
// Reel permalink, so this only needs to grab the shortcode segment and
// re-attach /embed, no need to know which form the permalink used.
// Shared by every surface that plays an Instagram video inline instead of
// linking out to instagram.com (VideoPlayer.tsx on the Academy detail
// page, VideoModal in VideoReelsSection.tsx on the homepage) — one place
// so both stay in sync on Instagram's embed URL shape.
export function toInstagramEmbedUrl(permalink: string): string | null {
  const match = permalink.match(/instagram\.com\/(p|reel)\/([^/?]+)/);
  if (!match) return null;
  return `https://www.instagram.com/${match[1]}/${match[2]}/embed`;
}
