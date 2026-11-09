'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import Link from 'next/link';
import {
  CalendarHeart, Droplets, Flower2, Gift, GlassWater, Heart, Leaf, Moon, PartyPopper, Percent,
  ShieldPlus, Snowflake, Sparkles, Star, Stethoscope, Sun, Tag, TreePine, Volume2, type LucideIcon,
} from 'lucide-react';
import type { BannerDoc } from '@/app/lib/banners/types';
import { getSpotlightTheme, type SpotlightIcon } from '@/app/lib/banners/spotlight';

// Campaign Spotlight: the festival or offer section above the banner slider. Everything
// it shows comes from an Admin → Banners "Festival / Campaign Spotlight" banner: theme,
// heading, cards, effects, background image or video, button and dates.
//
// Once the section scrolls into view the heading comes into focus letter by letter and
// the cards light one after another. The hidden starting state only applies after the
// script has run (the `is-armed` class), so without JavaScript, or with reduced motion,
// everything is simply shown.

const ICONS: Record<SpotlightIcon | 'tree' | 'party', LucideIcon> = {
  sparkles: Sparkles, flower: Flower2, moon: Moon, sun: Sun, 'glass-water': GlassWater,
  'shield-plus': ShieldPlus, droplets: Droplets, leaf: Leaf, heart: Heart, star: Star, gift: Gift,
  tag: Tag, percent: Percent, calendar: CalendarHeart, stethoscope: Stethoscope, snowflake: Snowflake,
  tree: TreePine, party: PartyPopper,
};
const iconFor = (name: string | undefined) => ICONS[name as SpotlightIcon] ?? Sparkles;

// Card grid from tablet up, sized to how many cards there are (literal classes for Tailwind).
const GRID: Record<number, string> = {
  1: 'sm:grid-cols-1 sm:max-w-md sm:mx-auto',
  2: 'sm:grid-cols-2 sm:max-w-3xl sm:mx-auto',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-5',
  6: 'sm:grid-cols-2 lg:grid-cols-3',
};

// Fixed positions (not random) so the server and browser render the same markup.
const SPARKS = [
  [6, 0], [14, 2.4], [23, 1.1], [31, 3.6], [42, 0.6], [51, 2.9], [58, 1.7],
  [66, 4.2], [73, 0.3], [81, 2.1], [88, 3.3], [95, 1.4],
] as const;

// Twinkling stars around the heading: [top %, left %, size px, delay s].
const TWINKLES = [
  [4, 12, 18, 0], [18, 88, 14, 1.2], [42, 4, 12, 2.1], [58, 94, 20, 0.6],
  [30, 24, 10, 1.7], [10, 72, 12, 2.6], [70, 16, 16, 3.1], [76, 80, 10, 0.9],
] as const;

// Soft firework bursts in the sky: [left %, top %, delay s, colour key, phone too].
const FIREWORKS = [
  [12, 14, 0.4, 'a1', true], [86, 10, 1.9, 'a3', true], [70, 32, 3.4, 'a1', false],
  [28, 36, 2.7, 'a2', false], [50, 6, 4.6, 'a2', true],
] as const;

function Diya({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 56" className={`spot-diya ${className}`} aria-hidden>
      <defs>
        <radialGradient id="spot-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD27A" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="spot-clay" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8833A" />
          <stop offset="100%" stopColor="#9C3D12" />
        </linearGradient>
        <linearGradient id="spot-fire" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#F5A623" />
          <stop offset="60%" stopColor="#FFD27A" />
          <stop offset="100%" stopColor="#FFF6DD" />
        </linearGradient>
      </defs>
      <circle className="spot-halo" cx="32" cy="20" r="20" fill="url(#spot-glow)" />
      <g className="spot-flame">
        <g className="spot-flicker">
          <path d="M32 4 C38 13 38 20 32 25 C26 20 26 13 32 4 Z" fill="url(#spot-fire)" />
          <path d="M32 13 C34.5 17 34.5 20 32 22.5 C29.5 20 29.5 17 32 13 Z" fill="#FFFBEF" />
        </g>
      </g>
      <path d="M6 30 Q32 33 58 30 Q54 50 32 51 Q10 50 6 30 Z" fill="url(#spot-clay)" />
      <path d="M6 30 Q32 35 58 30" fill="none" stroke="#FFD27A" strokeOpacity="0.55" strokeWidth="1.5" />
      <circle cx="22" cy="41" r="1.6" fill="#FFD27A" fillOpacity="0.7" />
      <circle cx="32" cy="43" r="1.6" fill="#FFD27A" fillOpacity="0.7" />
      <circle cx="42" cy="41" r="1.6" fill="#FFD27A" fillOpacity="0.7" />
    </svg>
  );
}

// Mandala pattern in the corners (rangoli, kolam, pookalam), drawn in the theme accent.
function Pattern({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} style={{ color: 'var(--sp-a2)' }} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="100" cy="100" r="18" />
        <circle cx="100" cy="100" r="40" strokeDasharray="3 5" />
        <circle cx="100" cy="100" r="92" strokeDasharray="1 7" />
        {Array.from({ length: 12 }, (_, i) => (
          <g key={i} transform={`rotate(${i * 30} 100 100)`}>
            <path d="M100 58 C112 40 112 22 100 10 C88 22 88 40 100 58 Z" />
            <circle cx="100" cy="72" r="3" />
          </g>
        ))}
      </g>
    </svg>
  );
}

// Cards lean gently towards the pointer, on mouse and pen only (never on touch scroll).
function tilt(e: PointerEvent<HTMLLIElement>) {
  if (e.pointerType === 'touch') return;
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -8}deg`);
  e.currentTarget.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 10}deg`);
  e.currentTarget.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
}

function untilt(e: PointerEvent<HTMLLIElement>) {
  e.currentTarget.style.setProperty('--rx', '0deg');
  e.currentTarget.style.setProperty('--ry', '0deg');
}

// The rocket show: [left %, burst height %, launch s, colour key]. Each rocket climbs for
// LAUNCH seconds, then bursts; the sound below is scheduled from the same numbers.
const SHOW = [
  [22, 20, 0, 'a1'], [78, 16, 0.8, 'a3'], [64, 9, 1.6, 'a2'],
] as const;
const LAUNCH = 0.9;

// Firework sound made in the browser from filtered noise (no audio file): a rising
// whistle, a soft boom, then a crackle. Kept at a moderate level, never a sharp bang.
function noiseBuffer(ctx: AudioContext) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function noise(ctx: AudioContext, out: AudioNode, buf: AudioBuffer, at: number, dur: number, type: BiquadFilterType, from: number, to: number, level: number) {
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = buf;
  filter.type = type;
  filter.frequency.setValueAtTime(from, at);
  filter.frequency.exponentialRampToValueAtTime(to, at + dur);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(level, at + Math.min(0.02, dur / 4));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(filter).connect(gain).connect(out);
  src.start(at, Math.random());
  src.stop(at + dur + 0.05);
}

function firework(ctx: AudioContext, out: AudioNode, buf: AudioBuffer, at: number) {
  // Whistle on the way up
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.setValueAtTime(700, at);
  osc.frequency.exponentialRampToValueAtTime(2200, at + LAUNCH);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.05, at + 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, at + LAUNCH);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + LAUNCH + 0.05);
  noise(ctx, out, buf, at, LAUNCH, 'bandpass', 900, 3500, 0.08);
  // Boom
  const burst = at + LAUNCH;
  noise(ctx, out, buf, burst, 1.3, 'lowpass', 900, 120, 0.9);
  const thump = ctx.createOscillator();
  const tg = ctx.createGain();
  thump.frequency.setValueAtTime(110, burst);
  thump.frequency.exponentialRampToValueAtTime(45, burst + 0.4);
  tg.gain.setValueAtTime(0.0001, burst);
  tg.gain.exponentialRampToValueAtTime(0.5, burst + 0.01);
  tg.gain.exponentialRampToValueAtTime(0.0001, burst + 0.5);
  thump.connect(tg).connect(out);
  thump.start(burst);
  thump.stop(burst + 0.55);
  // Crackle as the sparks fall
  for (let i = 0; i < 28; i++) {
    noise(ctx, out, buf, burst + 0.25 + Math.random() * 1.3, 0.03, 'highpass', 2500, 4000, 0.12 + Math.random() * 0.18);
  }
}

export default function CampaignSpotlight({ banner }: { banner: BannerDoc }) {
  const sp = banner.spotlight;
  const theme = getSpotlightTheme(sp?.theme);
  const cards = (sp?.cards ?? []).filter((c) => c.title?.trim());
  const fireworks = !!sp?.effects?.fireworks;
  const sparkles = sp?.effects?.sparkles !== false;
  const sound = fireworks && !!sp?.effects?.sound;
  const heading = (banner.headline || '').trim();
  const lines = heading.split('\n').map((l) => l.trim()).filter(Boolean);
  const long = heading.replace(/\n/g, ' ').length > 18;
  const desktopImg = banner.desktopImage?.url || '';
  const mobileImg = banner.mobileImage?.url || desktopImg;
  const videoUrl = banner.video?.url || '';
  const headingId = `spot-heading-${banner._id}`;

  const ref = useRef<HTMLElement>(null);
  const audio = useRef<{ ctx: AudioContext; out: GainNode; buf: AudioBuffer } | null>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);
  const [show, setShow] = useState(0);
  const [played, setPlayed] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  // Sound only ever plays after a tap, never on its own. The tap replays the rocket
  // show, and each boom is scheduled for the moment its burst appears.
  const playFireworks = () => {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    if (!audio.current) {
      const ctx: AudioContext = new Ctx();
      const out = ctx.createGain();
      out.gain.value = 0.55;
      out.connect(ctx.destination);
      audio.current = { ctx, out, buf: noiseBuffer(ctx) };
    }
    const { ctx, out, buf } = audio.current;
    void ctx.resume();
    const now = ctx.currentTime + 0.05;
    SHOW.forEach(([, , t]) => firework(ctx, out, buf, now + t));
    setPlayed(true);
    setShow((n) => n + 1);
  };

  useEffect(() => () => void audio.current?.ctx.close(), []);

  useEffect(() => {
    const el = ref.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!el || !('IntersectionObserver' in window)) return;
    // The background video loads only once the section is on screen, and never for
    // visitors who ask for reduced motion or less data; they see the still image.
    const saveData = (navigator as any).connection?.saveData === true;
    const wantVideo = !!videoUrl && !reduced && !saveData;
    if (!reduced) setArmed(true);
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      if (wantVideo) setVideoSrc(videoUrl);
      if (reduced) return;
      setShown(true);
      if (fireworks) setShow(1);
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [videoUrl, fireworks]);

  const themeVars = {
    '--sp-bg1': theme.bg[0], '--sp-bg2': theme.bg[1], '--sp-bg3': theme.bg[2],
    '--sp-a1': theme.a1, '--sp-a2': theme.a2, '--sp-a3': theme.a3, '--sp-a4': theme.a4,
  } as CSSProperties;
  const colour = (key: 'a1' | 'a2' | 'a3') => theme[key];
  const Emblem = theme.emblem === 'diya' ? null : iconFor(theme.emblem);

  let letterIndex = 0;

  return (
    <section
      ref={ref}
      aria-labelledby={headingId}
      style={themeVars}
      className={`spot-section relative overflow-hidden py-12 sm:py-20 ${armed ? 'is-armed' : ''} ${shown ? 'is-shown' : ''}`}
    >
      {(desktopImg || videoUrl) && (
        <>
          {desktopImg && !videoSrc && (
            <picture>
              {mobileImg !== desktopImg && <source media="(max-width: 639px)" srcSet={mobileImg} />}
              <img src={desktopImg} alt="" className="spot-media" decoding="async" />
            </picture>
          )}
          {videoSrc && (
            <video
              className="spot-media"
              src={videoSrc}
              poster={desktopImg || undefined}
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              aria-hidden
            />
          )}
          <div className="spot-veil" aria-hidden />
        </>
      )}
      <div className="spot-aurora" aria-hidden />
      {theme.pattern && (
        <>
          <Pattern className="spot-rangoli absolute -top-24 -right-24 w-72 sm:w-[28rem] opacity-15" />
          <Pattern className="spot-rangoli spot-rangoli-rev absolute -bottom-28 -left-28 w-64 sm:w-96 opacity-10" />
        </>
      )}
      {fireworks && show > 0 && (
        <div key={show} className="pointer-events-none absolute inset-0" aria-hidden>
          {SHOW.map(([left, top, t, c]) => (
            <div key={left} className="spot-rocket" style={{ left: `${left}%`, top: `${top}%`, '--t': `${t}s`, '--c': colour(c) } as CSSProperties}>
              <i className="spot-rocket-trail" />
              <i className="spot-rocket-flash" />
              {Array.from({ length: 24 }, (_, i) => (
                <span key={i} style={{ '--a': `${i * 15}deg` } as CSSProperties} />
              ))}
            </div>
          ))}
        </div>
      )}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {fireworks && FIREWORKS.map(([left, top, delay, c, phone]) => (
          <div
            key={`${left}-${top}`}
            className={`spot-firework ${phone ? '' : 'hidden sm:block'}`}
            style={{ left: `${left}%`, top: `${top}%`, '--t': `${delay}s`, '--c': colour(c) } as CSSProperties}
          >
            {Array.from({ length: 14 }, (_, i) => (
              <span key={i} style={{ '--a': `${i * (360 / 14)}deg` } as CSSProperties} />
            ))}
          </div>
        ))}
        {sparkles && SPARKS.map(([left, delay]) => (
          <span key={left} className="spot-spark" style={{ left: `${left}%`, animationDelay: `${delay}s` }} />
        ))}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="relative text-center max-w-2xl mx-auto">
          {/* First thing in view, shown from the start: one tap plays the rockets with sound. */}
          {sound && (
            <button
              type="button"
              onClick={playFireworks}
              className="spot-sound inline-flex items-center gap-2 mb-6 px-5 py-2.5 rounded-full border text-sm font-bold shadow-lg shadow-black/30 transition-colors"
            >
              <Volume2 size={16} aria-hidden />
              {played ? 'Play fireworks again' : (sp?.soundLabel?.trim() || 'Tap for fireworks')}
            </button>
          )}
          <div className="relative w-fit mx-auto">
            {Emblem ? (
              <span className="spot-emblem spot-rise" style={{ '--d': '0.1s' } as CSSProperties} aria-hidden>
                <Emblem size={40} strokeWidth={1.4} />
              </span>
            ) : (
              <Diya className="spot-hero-diya w-24 h-20 sm:w-28 sm:h-24" />
            )}
            {sparkles && (
              <div className="spot-burst" aria-hidden>
                {Array.from({ length: 12 }, (_, i) => (
                  <span key={i} style={{ '--a': `${i * 30}deg` } as CSSProperties} />
                ))}
              </div>
            )}
          </div>
          {sparkles && TWINKLES.map(([top, left, size, delay]) => (
            <svg
              key={`${top}-${left}`}
              viewBox="0 0 24 24"
              className="spot-twinkle"
              style={{ top: `${top}%`, left: `${left}%`, width: size, height: size, animationDelay: `${delay}s` }}
              aria-hidden
            >
              <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" fill="var(--sp-a1)" />
            </svg>
          ))}
          {banner.subtitle?.trim() && (
            <p className="spot-rise text-xs sm:text-sm font-bold uppercase tracking-[0.3em] mt-4" style={{ '--d': '0.2s', color: 'var(--sp-a1)' } as CSSProperties}>
              {banner.subtitle}
            </p>
          )}
          <h2
            id={headingId}
            aria-label={lines.join(' ')}
            className={`font-headline font-extrabold tracking-tight mt-3 leading-none ${long ? 'text-4xl sm:text-6xl' : 'text-5xl sm:text-7xl'}`}
          >
            {lines.map((line, li) => (
              <span key={li} className="block" aria-hidden>
                {line.split(/\s+/).map((word, wi, words) => (
                  <span key={wi}>
                    {/* Letters of one word never split across lines */}
                    <span className="inline-block whitespace-nowrap">
                      {word.split('').map((ch, ci) => (
                        <span key={ci} className="spot-letter" style={{ '--d': `${0.35 + letterIndex++ * 0.06}s` } as CSSProperties}>
                          {ch}
                        </span>
                      ))}
                    </span>
                    {wi < words.length - 1 && ' '}
                  </span>
                ))}
              </span>
            ))}
          </h2>
          {banner.description?.trim() && (
            <p className="spot-rise text-white/85 text-base sm:text-lg mt-5" style={{ '--d': '1.1s' } as CSSProperties}>
              {banner.description}
            </p>
          )}
        </div>

        {/* On phones the cards swipe sideways like stories; a grid from tablet up. */}
        {cards.length > 0 && (
          <ol className={`spot-track flex sm:grid gap-4 mt-12 sm:mt-16 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto sm:overflow-visible snap-x snap-mandatory [perspective:1000px] ${GRID[cards.length] ?? GRID[6]}`}>
            {cards.map((card, i) => {
              const tone = theme.tones[i % theme.tones.length];
              const Icon = iconFor(card.icon);
              return (
                <li
                  key={`${i}-${card.title}`}
                  onPointerMove={tilt}
                  onPointerLeave={untilt}
                  className={`spot-card relative rounded-3xl p-5 pt-6 flex flex-col shrink-0 ${cards.length === 1 ? 'w-full' : 'w-[80%]'} sm:w-auto snap-center`}
                  style={{ '--d': `${1.3 + i * 0.22}s`, '--g1': tone[0], '--g2': tone[1], '--tint': tone[2] } as CSSProperties}
                >
                  <span className="spot-card-foil" aria-hidden />
                  {cards.length > 1 && (
                    <span className="spot-card-num font-headline font-extrabold" aria-hidden>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  )}
                  <span className="spot-card-icon" aria-hidden>
                    <Icon size={20} strokeWidth={1.6} />
                  </span>
                  {card.label?.trim() && (
                    <p className="spot-card-label mt-4 text-[11px] font-bold uppercase tracking-[0.18em]">
                      {cards.length > 1 && <span className="sr-only">{i + 1} of {cards.length}: </span>}
                      {card.label}
                    </p>
                  )}
                  <h3 className={`text-white font-bold text-base leading-snug ${card.label?.trim() ? 'mt-1.5' : 'mt-4'}`}>{card.title}</h3>
                  {card.body?.trim() && (
                    <>
                      <span className="spot-card-rule" aria-hidden />
                      <p className="text-white/80 text-sm leading-relaxed">{card.body}</p>
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {(sp?.closingLine?.trim() || sp?.disclaimer?.trim() || banner.primaryCTA?.label) && (
          <div className="spot-rise text-center mt-12" style={{ '--d': cards.length ? '2.6s' : '1.4s' } as CSSProperties}>
            {sp?.closingLine?.trim() && (
              <p className="text-white font-headline text-xl sm:text-2xl font-bold">{sp.closingLine}</p>
            )}
            {sp?.disclaimer?.trim() && <p className="text-white/70 text-sm mt-2">{sp.disclaimer}</p>}
            {(banner.primaryCTA?.label || banner.secondaryCTA?.label) && (
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                {banner.primaryCTA?.label && banner.primaryCTA.href && (
                  <Link href={banner.primaryCTA.href} className="pmj-cta inline-flex items-center gap-2 px-7 py-3 rounded-full font-bold text-primary">
                    {banner.primaryCTA.label}
                  </Link>
                )}
                {banner.secondaryCTA?.label && banner.secondaryCTA.href && (
                  <Link href={banner.secondaryCTA.href} className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white border border-white/40 hover:bg-white/10 transition-colors">
                    {banner.secondaryCTA.label}
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
