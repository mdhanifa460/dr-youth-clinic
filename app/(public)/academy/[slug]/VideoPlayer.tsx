'use client';

import { useEffect, useRef, useState, useId } from 'react';
import { toInstagramEmbedUrl } from '@/app/lib/instagramEmbed';

interface Chapter {
  time: string;
  timeSeconds: number;
  label: string;
}

interface VideoPlayerProps {
  platform?: 'youtube' | 'instagram';
  youtubeId: string;
  instagramUrl?: string;
  title: string;
  chapters: Chapter[];
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;

function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

// Converts a free-text chapter time like "2:30" or "1:02:30" into seconds.
function parseTimeToSeconds(time: string): number {
  if (!time) return 0;
  return time
    .split(':')
    .map((p) => parseInt(p, 10) || 0)
    .reduce((acc, val) => acc * 60 + val, 0);
}

export default function VideoPlayer({ platform = 'youtube', youtubeId, instagramUrl, title, chapters }: VideoPlayerProps) {
  const playerRef = useRef<any>(null);
  const rawId = useId();
  const iframeId = `yt-player-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const [activeChapter, setActiveChapter] = useState<number | null>(null);

  useEffect(() => {
    if (platform !== 'youtube') return;
    let cancelled = false;

    loadYouTubeIframeApi().then(() => {
      if (cancelled) return;
      playerRef.current = new window.YT.Player(iframeId, {
        events: {
          onReady: () => {},
        },
      });
    });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* no-op */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, iframeId]);

  const handleChapterClick = (chapter: Chapter, index: number) => {
    const seconds = chapter.timeSeconds && chapter.timeSeconds > 0
      ? chapter.timeSeconds
      : parseTimeToSeconds(chapter.time);

    setActiveChapter(index);
    const player = playerRef.current;
    if (player?.seekTo) {
      player.seekTo(seconds, true);
      player.playVideo?.();
    }
  };

  // Instagram's iframe embed has no equivalent of the YouTube iframe API
  // (no programmatic seek), so it's a straight embed with no chapter-click
  // interactivity — chapters aren't populated by the Instagram sync job
  // anyway (see app/api/admin/videos/sync-instagram/route.ts), so this
  // never hides a feature an admin actually filled in.
  if (platform === 'instagram') {
    const embedUrl = instagramUrl ? toInstagramEmbedUrl(instagramUrl) : null;
    if (!embedUrl) {
      return (
        <div className="relative aspect-[9/16] max-w-sm mx-auto rounded-2xl md:rounded-3xl overflow-hidden bg-gray-100 flex flex-col items-center justify-center text-center px-6">
          <p className="text-gray-500 font-semibold text-sm">Video unavailable</p>
          <p className="text-gray-500 text-xs mt-1">This video's Instagram link needs to be updated in the admin panel.</p>
        </div>
      );
    }
    return (
      <div className="relative aspect-[9/16] max-w-sm mx-auto rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_12px_48px_rgba(0,32,69,0.12)] bg-[#0B2560]">
        <iframe
          className="absolute inset-0 w-full h-full"
          src={embedUrl}
          title={title}
          allow="encrypted-media; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  if (!youtubeId) {
    return (
      <div className="relative aspect-video rounded-2xl md:rounded-3xl overflow-hidden bg-gray-100 flex flex-col items-center justify-center text-center px-6">
        <p className="text-gray-500 font-semibold text-sm">Video unavailable</p>
        <p className="text-gray-500 text-xs mt-1">This video's link needs to be updated in the admin panel.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-video rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_12px_48px_rgba(0,32,69,0.12)] bg-[#0B2560]">
        <iframe
          id={iframeId}
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      {chapters.length > 0 && (
        <div className="mt-5 bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
          <p className="px-4 sm:px-5 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-widest">
            Chapters
          </p>
          {chapters.map((chapter, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleChapterClick(chapter, i)}
              className={`w-full flex items-center gap-3 px-4 sm:px-5 py-3 text-left transition ${
                activeChapter === i ? 'bg-[#f6faff]' : 'hover:bg-[#f6faff]'
              }`}
            >
              <span className="text-xs font-bold text-[#3B82C4] tabular-nums shrink-0 w-14">
                {chapter.time}
              </span>
              <span className="text-sm text-[#0B2560] font-medium">{chapter.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
