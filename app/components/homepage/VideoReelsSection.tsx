'use client';

// "Watch & Learn" homepage section — ported from the approved mockup
// (dryouth_video_reels_section.html). Two content shapes share one
// component: full-procedure YouTube videos (16:9 grid) and vertical
// Shorts/Reels (9:16 scroll-snap tray). Both read from the SAME typed
// `WatchMediaItem[]` below — a "video" kind renders in the grid, a "reel"
// kind renders in the tray — so wiring in real data later is one array,
// not two parallel shapes to keep in sync.
//
// This component takes all of its content via props/defaults and has no
// data-fetching or homepage-only assumptions, so the exact same component
// can be reused on a service detail page later, filtered to that service's
// own videos — see the usage note at the bottom of this file.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Sora, IBM_Plex_Mono } from 'next/font/google';
import Image from 'next/image';
import { Play, X } from 'lucide-react';
import { FaYoutube, FaInstagram } from 'react-icons/fa';
import { useSiteConfig } from '@/app/components/SiteConfigContext';

// Scoped to this section only — the site's global headline font is Manrope
// (app/layout.tsx's --font-headline) and body is Inter (--font-body,
// already available via Tailwind's `font-body`). The approved mockup
// specifically calls for Sora + IBM Plex Mono, so those are loaded here
// rather than silently substituting the site's existing fonts, which
// would be a restyle. next/font self-hosts these at build time — no
// runtime Google Fonts request, no CLS.
const sora = Sora({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--wl-font-sora' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500', '600'], variable: '--wl-font-mono' });

// ─────────────────────────────────────────────────────────────────────────
// Data model — swap SAMPLE_WATCH_MEDIA for real data later; every other
// prop keeps working unchanged since nothing downstream reads sample data
// directly, only this typed array/prop.
// ─────────────────────────────────────────────────────────────────────────

export type WatchMediaKind = 'video' | 'reel';
export type WatchPlatform = 'youtube' | 'instagram';

export interface WatchMediaItem {
  id: string;
  kind: WatchMediaKind;
  platform: WatchPlatform;
  title: string;
  /** Display name, e.g. "Dr. Vendhan S." — long-form videos only. */
  doctor?: string;
  /** Pre-formatted, e.g. "12.4K views" (grid) or "42.3K" (tray) — kept as
   *  a string rather than a number so real-data formatting (K/M suffixes,
   *  locale) happens once upstream, not duplicated in this component. */
  views: string;
  /** "08:42" — long-form videos only. */
  duration?: string;
  thumbnail?: { url: string; alt?: string };
  /** Drives the modal's embedded player. */
  youtubeId?: string;
  /** Used when there's no in-page embed (e.g. an Instagram reel) — modal
   *  falls back to "Watch on Instagram" instead of a broken player. */
  href?: string;
  /** Reel-only decorative "story" progress dots — total segments shown. */
  storySegments?: number;
  /** How many of those segments render filled/active. Defaults to 1. */
  filledSegments?: number;
}

const SAMPLE_WATCH_MEDIA: WatchMediaItem[] = [
  {
    id: 'v1',
    kind: 'video',
    platform: 'youtube',
    title: 'Laser Hair Removal: What Actually Happens in the Room',
    doctor: 'Dr. Vendhan S.',
    views: '12.4K views',
    duration: '08:42',
    youtubeId: 'dQw4w9WgXcQ',
  },
  {
    id: 'v2',
    kind: 'video',
    platform: 'youtube',
    title: 'PRP for Hair Fall — Full Procedure, Start to Finish',
    doctor: 'Dr. Govindasamy',
    views: '8.9K views',
    duration: '11:05',
    youtubeId: 'dQw4w9WgXcQ',
  },
  {
    id: 'v3',
    kind: 'video',
    platform: 'youtube',
    title: 'Chemical Peels Explained: Which One Is Right for You?',
    doctor: 'Dr. Murali K.',
    views: '15.1K views',
    duration: '06:18',
    youtubeId: 'dQw4w9WgXcQ',
  },
  {
    id: 'r1',
    kind: 'reel',
    platform: 'youtube',
    title: '3 signs your skin needs a dermatologist, not a serum',
    views: '42.3K',
    storySegments: 3,
    youtubeId: 'dQw4w9WgXcQ',
  },
  {
    id: 'r2',
    kind: 'reel',
    platform: 'instagram',
    title: 'Before & after: 6 sessions of glutathione therapy',
    views: '28.7K',
    storySegments: 2,
    href: 'https://instagram.com',
  },
  {
    id: 'r3',
    kind: 'reel',
    platform: 'youtube',
    title: 'Is hair transplant painful? Dr. Moideen answers',
    views: '61.2K',
    storySegments: 4,
    youtubeId: 'dQw4w9WgXcQ',
  },
  {
    id: 'r4',
    kind: 'reel',
    platform: 'instagram',
    title: 'Inside our Chennai clinic — a walkthrough',
    views: '19.5K',
    storySegments: 2,
    href: 'https://instagram.com',
  },
  {
    id: 'r5',
    kind: 'reel',
    platform: 'youtube',
    title: 'Myth vs fact: does sunscreen cause vitamin D deficiency?',
    views: '33.8K',
    storySegments: 3,
    youtubeId: 'dQw4w9WgXcQ',
  },
];

// Cosmetic gradient fallbacks for whichever items don't have a real
// thumbnail yet — cycles through the mockup's exact three navy variants
// instead of showing the same flat gradient on every card.
const THUMB_GRADIENTS = [
  'from-[#1B2A6B] to-[#0F1B4C]',
  'from-[#233784] to-[#0F1B4C]',
  'from-[#1B2A6B] via-[#101D55] to-[#0F1B4C]',
];
const REEL_GRADIENTS = [
  'from-[#233784] to-[#0F1B4C]',
  'from-[#5B3A8F] via-[#B23A6B] to-[#E08A3E]',
  'from-[#3A5B8F] via-[#8F3A7E] to-[#E0A83E]',
];

type FilterKey = 'all' | 'video' | 'reel';
const TABS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'video', label: 'Videos' },
  { key: 'reel', label: 'Shorts & Reels' },
];

export interface VideoReelsSectionProps {
  eyebrow?: string;
  headline?: string;
  /** Rendered as-is; wrap the word you want gold in a literal <span> in the
   *  string, or pass headline as JSX-free plain text and use headlineAccent
   *  to mark just one word gold, matching the mockup's "before" highlight. */
  headlineAccent?: string;
  subhead?: string;
  media?: WatchMediaItem[];
  ctaTitle?: string;
  ctaSubtitle?: string;
  /** Section id, useful if this also gets dropped onto a service detail
   *  page and needs a distinct anchor from the homepage instance. */
  id?: string;
}

export default function VideoReelsSection({
  eyebrow = 'Patient Education · On Screen',
  headline = 'Watch the treatment',
  headlineAccent = 'before',
  subhead = 'Real procedures, real doctors, explained in plain language — pulled straight from our YouTube channel and Instagram, in one place.',
  media = SAMPLE_WATCH_MEDIA,
  ctaTitle = 'Follow along — new videos every week',
  ctaSubtitle = '10K+ subscribers already learning before they book.',
  id = 'watch-and-learn',
}: VideoReelsSectionProps) {
  const { youtubeUrl, instagramUrl } = useSiteConfig();
  const [activeTab, setActiveTab] = useState<FilterKey>('all');
  const [activeItem, setActiveItem] = useState<WatchMediaItem | null>(null);

  const videos = useMemo(() => media.filter((m) => m.kind === 'video'), [media]);
  const reels = useMemo(() => media.filter((m) => m.kind === 'reel'), [media]);
  const showVideos = (activeTab === 'all' || activeTab === 'video') && videos.length > 0;
  const showReels = (activeTab === 'all' || activeTab === 'reel') && reels.length > 0;

  return (
    <section id={id} className={`${sora.variable} ${plexMono.variable} bg-[#FBF8F2] py-12 md:py-16`}>
      <div className="max-w-[1180px] mx-auto px-6 md:px-6">

        {/* HEADER */}
        <div className="flex justify-between items-end flex-wrap gap-6 mb-9">
          <div>
            <span className="inline-flex items-center gap-2 font-[family-name:var(--wl-font-mono)] text-[11.5px] tracking-[0.14em] uppercase text-[#DD9526] bg-[#F2A93B]/[0.12] border border-[#F2A93B]/[0.35] px-3 py-1.5 rounded-full mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F2A93B] shadow-[0_0_0_3px_rgba(242,169,59,0.25)]" />
              {eyebrow}
            </span>
            <h2 className="font-[family-name:var(--wl-font-sora)] font-bold text-[clamp(28px,3.4vw,40px)] leading-[1.15] tracking-[-0.01em] max-w-[640px] text-[#0F1B4C]">
              {headline}{' '}
              <span className="text-[#DD9526]">{headlineAccent}</span>{' '}
              you book it.
            </h2>
            <p className="text-[15px] text-[#64708A] max-w-[460px] mt-3 leading-[1.55]">{subhead}</p>
          </div>

          <div className="flex gap-2 bg-white border border-[#DCE1EC] p-[5px] rounded-full w-fit">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`font-semibold text-[13.5px] px-[18px] py-[9px] rounded-full border-none transition-all duration-200 whitespace-nowrap ${
                  activeTab === t.key ? 'bg-[#0F1B4C] text-white' : 'bg-transparent text-[#64708A] hover:text-[#0F1B4C]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* FULL-PROCEDURE VIDEOS */}
        {showVideos && (
          <div>
            <div className="flex items-center gap-2.5 font-[family-name:var(--wl-font-sora)] font-semibold text-[15px] text-[#0F1B4C] mt-11 mb-[18px]">
              <span className="w-[22px] h-[2px] bg-[#F2A93B] inline-block" /> Full Procedure Videos
            </div>
            <div className="grid grid-cols-1 min-[621px]:grid-cols-2 min-[861px]:grid-cols-3 gap-[22px]">
              {videos.map((v, i) => (
                <VideoCard key={v.id} item={v} gradient={THUMB_GRADIENTS[i % THUMB_GRADIENTS.length]} onOpen={() => setActiveItem(v)} />
              ))}
            </div>
          </div>
        )}

        {/* SHORTS / REELS TRAY */}
        {showReels && (
          <div>
            <div className="flex items-center gap-2.5 font-[family-name:var(--wl-font-sora)] font-semibold text-[15px] text-[#0F1B4C] mt-11 mb-[18px]">
              <span className="w-[22px] h-[2px] bg-[#F2A93B] inline-block" /> Shorts &amp; Reels
            </div>
            <div className="relative">
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-[14px] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-[#DCE1EC] [&::-webkit-scrollbar-thumb]:rounded-full">
                {reels.map((r, i) => (
                  <ReelCard key={r.id} item={r} gradient={REEL_GRADIENTS[i % REEL_GRADIENTS.length]} onOpen={() => setActiveItem(r)} />
                ))}
              </div>
              <div className="absolute top-0 -right-px bottom-[14px] w-14 bg-gradient-to-r from-transparent to-[#FBF8F2] pointer-events-none" />
            </div>
          </div>
        )}

        {/* CTA BAR */}
        <div className="mt-[52px] bg-[#0F1B4C] rounded-[22px] px-9 py-8 flex items-center justify-between flex-wrap gap-5 relative overflow-hidden">
          <div className="absolute -top-[40%] -right-[8%] w-[280px] h-[280px] rounded-full bg-[radial-gradient(circle,rgba(242,169,59,0.18),transparent_70%)] pointer-events-none" />
          <div className="relative z-[1]">
            <div className="font-[family-name:var(--wl-font-sora)] font-bold text-white text-xl mb-1">{ctaTitle}</div>
            <div className="text-white/65 text-[13.5px]">{ctaSubtitle}</div>
          </div>
          <div className="flex gap-3 flex-wrap relative z-[1]">
            <a
              href={youtubeUrl || 'https://youtube.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-[13.5px] whitespace-nowrap bg-[#F2A93B] border-[1.5px] border-[#F2A93B] text-[#0F1B4C] transition-all hover:bg-[#DD9526] hover:border-[#DD9526]"
            >
              <Play size={14} fill="currentColor" /> Subscribe on YouTube
            </a>
            <a
              href={instagramUrl || 'https://instagram.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-[13.5px] whitespace-nowrap border-[1.5px] border-white/25 text-white bg-transparent transition-all hover:bg-white/[0.08] hover:border-white/50"
            >
              Follow on Instagram →
            </a>
          </div>
        </div>
      </div>

      <VideoModal item={activeItem} onClose={() => setActiveItem(null)} />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Long-form video card (16:9 grid)
// ─────────────────────────────────────────────────────────────────────────

function VideoCard({ item, gradient, onOpen }: { item: WatchMediaItem; gradient: string; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group text-left bg-white rounded-[18px] overflow-hidden border border-[#DCE1EC] cursor-pointer transition-all duration-300 hover:-translate-y-[5px] hover:shadow-[0_18px_34px_rgba(15,27,76,0.12)]"
    >
      <div className={`relative aspect-video overflow-hidden ${item.thumbnail?.url ? '' : `bg-gradient-to-br ${gradient}`}`}>
        {item.thumbnail?.url ? (
          <Image src={item.thumbnail.url} alt={item.thumbnail.alt || item.title} fill sizes="(max-width: 860px) 50vw, 33vw" className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.10),transparent_55%)]" />
        )}

        <span className="absolute top-3 left-3 z-[2] flex items-center gap-[5px] bg-white/95 pl-[7px] pr-[10px] py-[5px] rounded-full text-[11px] font-bold text-[#111]">
          {item.platform === 'youtube' ? <FaYoutube size={14} className="text-red-600" /> : <FaInstagram size={13} className="text-[#0F1B4C]" />}
          {item.platform === 'youtube' ? 'YouTube' : 'Instagram'}
        </span>

        <span className="absolute inset-0 z-[2] flex items-center justify-center">
          <span className="w-[52px] h-[52px] rounded-full bg-white/[0.16] border-[1.5px] border-white/55 backdrop-blur-[2px] flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:bg-[#F2A93B] group-hover:border-[#F2A93B]">
            <Play size={20} className="text-white ml-0.5" fill="white" />
          </span>
        </span>

        {item.duration && (
          <span className="absolute bottom-3 right-3 z-[2] font-[family-name:var(--wl-font-mono)] text-[11px] font-semibold text-[#F2A93B] bg-[#0F1B4C]/85 px-2 py-1 rounded-md flex items-center gap-[5px]">
            <span className="w-[5px] h-[5px] rounded-full bg-[#F2A93B] shadow-[0_0_0_2px_rgba(242,169,59,0.3)]" />
            {item.duration}
          </span>
        )}
      </div>

      <div className="px-4 pt-4 pb-[18px]">
        <div className="font-[family-name:var(--wl-font-sora)] font-semibold text-[14.5px] leading-[1.4] text-[#0F1B4C] mb-2">{item.title}</div>
        <div className="flex items-center justify-between text-[12px] text-[#64708A]">
          {item.doctor && <span>{item.doctor}</span>}
          <span className="font-[family-name:var(--wl-font-mono)] text-[11px]">{item.views}</span>
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Shorts/Reels tray card (9:16, scroll-snap)
// ─────────────────────────────────────────────────────────────────────────

function ReelCard({ item, gradient, onOpen }: { item: WatchMediaItem; gradient: string; onOpen: () => void }) {
  const segments = item.storySegments ?? 3;
  const filled = item.filledSegments ?? 1;

  return (
    <button
      onClick={onOpen}
      className={`text-left snap-start shrink-0 basis-[178px] w-[178px] aspect-[9/16] rounded-2xl relative overflow-hidden cursor-pointer transition-transform duration-300 border border-[#0F1B4C]/[0.08] hover:-translate-y-1.5 ${item.thumbnail?.url ? '' : `bg-gradient-to-b ${gradient}`}`}
    >
      {item.thumbnail?.url && (
        <Image src={item.thumbnail.url} alt={item.thumbnail.alt || item.title} fill sizes="178px" className="object-cover" />
      )}

      <div className="absolute top-2 left-2 right-2 z-[3] flex gap-1">
        {Array.from({ length: segments }).map((_, i) => (
          <span key={i} className={`flex-1 h-[2.5px] rounded-full ${i < filled ? 'bg-white/90' : 'bg-white/35'}`} />
        ))}
      </div>

      <div className="absolute top-4 left-2 z-[3] flex items-center gap-1 bg-black/35 px-2 py-1 rounded-full text-[9.5px] font-bold text-white tracking-[0.02em]">
        {item.platform === 'youtube' ? (
          <>
            <FaYoutube size={11} className="text-red-500" /> Shorts
          </>
        ) : (
          <>
            <FaInstagram size={11} className="text-white" /> Reels
          </>
        )}
      </div>

      <div className="absolute inset-0 z-[2] flex items-center justify-center">
        <span className="w-[38px] h-[38px] rounded-full bg-white/[0.16] border-[1.5px] border-white/55 backdrop-blur-[2px] flex items-center justify-center">
          <Play size={14} className="text-white ml-0.5" fill="white" />
        </span>
      </div>

      <div className="absolute bottom-0 inset-x-0 z-[3] pt-7 px-2.5 pb-2.5 bg-gradient-to-t from-black/75 to-transparent">
        <div className="text-white text-[11.5px] font-semibold leading-[1.35] mb-1.5">{item.title}</div>
        <div className="font-[family-name:var(--wl-font-mono)] text-[9.5px] text-white/75 flex items-center gap-1">
          <span className="text-[7px]">▶</span> {item.views}
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Playback modal — deliberately minimal (per request, final design to be
// confirmed separately). Embeds YouTube directly when youtubeId is set;
// falls back to an honest "watch on Instagram" link when it isn't (an
// Instagram reel has no first-party embeddable iframe without their JS
// SDK, so this never fakes a player it can't actually show).
// ─────────────────────────────────────────────────────────────────────────

function VideoModal({ item, onClose }: { item: WatchMediaItem | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!item) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [item, onClose]);

  if (!item) return null;

  const isVertical = item.kind === 'reel';

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        className={`relative bg-black rounded-2xl overflow-hidden shadow-2xl ${isVertical ? 'w-full max-w-[420px] aspect-[9/16]' : 'w-full max-w-3xl aspect-video'}`}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
        >
          <X size={18} />
        </button>

        {item.youtubeId ? (
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1&rel=0`}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
            <p className="text-white font-semibold">{item.title}</p>
            <a
              href={item.href || 'https://instagram.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-[#0F1B4C] px-5 py-2.5 rounded-full font-semibold text-sm"
            >
              <FaInstagram size={16} /> Watch on Instagram
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Reuse on a service detail page: this component takes all its content via
// props, so the exact same component works there — filter the real media
// list to items tagged with that service (once the Video model has a
// service reference) and render a scoped instance:
//
//   <VideoReelsSection
//     id="service-watch-and-learn"
//     eyebrow="This Treatment · On Screen"
//     headline="Watch this treatment"
//     headlineAccent="before"
//     subhead={`Real ${svc.name} procedures and patient stories from our channel.`}
//     media={videosForThisService}
//     ctaTitle="See more real procedures"
//     ctaSubtitle={`${videosForThisService.length} videos about ${svc.name} and related treatments.`}
//   />
//
// A good drop-in spot on app/(public)/[location]/services/[category]/
// [slug]/page.tsx is right after the "Documented Patient Results" block —
// same "trust/proof" role, one section later.
