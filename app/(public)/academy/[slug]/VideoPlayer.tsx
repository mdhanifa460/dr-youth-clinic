'use client';

import { useEffect, useRef, useState, useId } from 'react';

interface Chapter {
  time: string;
  timeSeconds: number;
  label: string;
}

interface VideoPlayerProps {
  youtubeId: string;
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

export default function VideoPlayer({ youtubeId, title, chapters }: VideoPlayerProps) {
  const playerRef = useRef<any>(null);
  const rawId = useId();
  const iframeId = `yt-player-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const [activeChapter, setActiveChapter] = useState<number | null>(null);

  useEffect(() => {
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
  }, [iframeId]);

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
          <p className="px-4 sm:px-5 py-3 text-xs font-extrabold text-gray-400 uppercase tracking-widest">
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
