'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import Link from 'next/link';
import { Flower2, GlassWater, Moon, ShieldPlus, Sun, Volume2, type LucideIcon } from 'lucide-react';

// Five diyas, five tips. Once the section scrolls into view the heading comes into
// focus letter by letter and the cards light one after another. The hidden starting
// state only applies after the script has run (the `is-armed` class), so without
// JavaScript, or with reduced motion, everything is simply shown. General care only:
// no treatment claims, offers or results.
// Each card has its own gold tone: [light gold, deep gold, corner tint].
type Tip = {
  label: string;
  icon: LucideIcon;
  tone: readonly [string, string, string];
  title: string;
  body: string;
};

const TIPS: Tip[] = [
  {
    label: 'Test first',
    icon: Flower2,
    tone: ['#FFE3A3', '#C9962B', 'rgba(255, 200, 90, 0.30)'],
    title: 'Patch-test new makeup and mehendi',
    body: 'Try anything new on a small patch of skin a day or two before the festivities. Stop if it itches, reddens or burns.',
  },
  {
    label: 'Night care',
    icon: Moon,
    tone: ['#F3D9B8', '#B07A4A', 'rgba(236, 140, 150, 0.30)'],
    title: 'Wash off the smoke at night',
    body: 'Smoke, dust and festive makeup sit on your skin all evening. Cleanse gently before bed, then moisturise.',
  },
  {
    label: 'Hydrate',
    icon: GlassWater,
    tone: ['#FFF1C9', '#D4A53A', 'rgba(255, 240, 200, 0.24)'],
    title: 'Keep sipping water',
    body: 'Late nights, travel and sweets add up. Keep a water bottle close and rest between celebrations.',
  },
  {
    label: 'Sun care',
    icon: Sun,
    tone: ['#FFD08A', '#D9822B', 'rgba(255, 150, 50, 0.32)'],
    title: 'Sunscreen for daytime errands',
    body: 'Shopping, visits and decorating mean hours outdoors. Use a broad-spectrum sunscreen and reapply if you stay out long.',
  },
  {
    label: 'Quick first aid',
    icon: ShieldPlus,
    tone: ['#F7C9A8', '#B8603A', 'rgba(220, 100, 70, 0.32)'],
    title: 'If a spark burns your skin',
    body: 'Hold it under cool running water for 20 minutes. Skip ice, toothpaste and butter. See a doctor for large burns or any on the face, hands or eyes.',
  },
];

const HEADING = 'Happy Diwali';

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

// Soft firework bursts in the sky: [left %, top %, delay s, colour, phone too].
const FIREWORKS = [
  [12, 14, 0.4, '#FFD27A', true], [86, 10, 1.9, '#FF8FA3', true], [70, 32, 3.4, '#FFF6DD', false],
  [28, 36, 2.7, '#F5A623', false], [50, 6, 4.6, '#FFB86B', true],
] as const;

function Diya({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 56" className={`diwali-diya ${className}`} aria-hidden>
      <defs>
        <radialGradient id="diwali-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD27A" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="diwali-clay" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8833A" />
          <stop offset="100%" stopColor="#9C3D12" />
        </linearGradient>
        <linearGradient id="diwali-fire" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#F5A623" />
          <stop offset="60%" stopColor="#FFD27A" />
          <stop offset="100%" stopColor="#FFF6DD" />
        </linearGradient>
      </defs>
      <circle className="diwali-halo" cx="32" cy="20" r="20" fill="url(#diwali-glow)" />
      <g className="diwali-flame">
        <g className="diwali-flicker">
          <path d="M32 4 C38 13 38 20 32 25 C26 20 26 13 32 4 Z" fill="url(#diwali-fire)" />
          <path d="M32 13 C34.5 17 34.5 20 32 22.5 C29.5 20 29.5 17 32 13 Z" fill="#FFFBEF" />
        </g>
      </g>
      <path d="M6 30 Q32 33 58 30 Q54 50 32 51 Q10 50 6 30 Z" fill="url(#diwali-clay)" />
      <path d="M6 30 Q32 35 58 30" fill="none" stroke="#FFD27A" strokeOpacity="0.55" strokeWidth="1.5" />
      <circle cx="22" cy="41" r="1.6" fill="#FFD27A" fillOpacity="0.7" />
      <circle cx="32" cy="43" r="1.6" fill="#FFD27A" fillOpacity="0.7" />
      <circle cx="42" cy="41" r="1.6" fill="#FFD27A" fillOpacity="0.7" />
    </svg>
  );
}

function Rangoli({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <g fill="none" stroke="#F5A623" strokeWidth="1.2">
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

// The rocket show: [left %, burst height %, launch s, colour]. Each rocket climbs for
// LAUNCH seconds, then bursts; the sound below is scheduled from the same numbers.
const SHOW = [
  [22, 20, 0, '#FFD27A'], [78, 16, 0.8, '#FF8FA3'], [64, 9, 1.6, '#FFF6DD'],
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

export default function DiwaliSpotlight() {
  const ref = useRef<HTMLElement>(null);
  const audio = useRef<{ ctx: AudioContext; out: GainNode; buf: AudioBuffer } | null>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);
  const [show, setShow] = useState(0);
  const [played, setPlayed] = useState(false);

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
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !el || !('IntersectionObserver' in window)) return;
    setArmed(true);
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      setShown(true);
      setShow(1);
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      aria-labelledby="diwali-heading"
      className={`diwali-section relative overflow-hidden py-12 sm:py-20 ${armed ? 'is-armed' : ''} ${shown ? 'is-shown' : ''}`}
    >
      <div className="diwali-aurora" aria-hidden />
      <Rangoli className="diwali-rangoli absolute -top-24 -right-24 w-72 sm:w-[28rem] opacity-15" />
      <Rangoli className="diwali-rangoli diwali-rangoli-rev absolute -bottom-28 -left-28 w-64 sm:w-96 opacity-10" />
      {show > 0 && (
        <div key={show} className="pointer-events-none absolute inset-0" aria-hidden>
          {SHOW.map(([left, top, t, colour]) => (
            <div key={left} className="diwali-rocket" style={{ left: `${left}%`, top: `${top}%`, '--t': `${t}s`, '--c': colour } as CSSProperties}>
              <i className="diwali-rocket-trail" />
              <i className="diwali-rocket-flash" />
              {Array.from({ length: 24 }, (_, i) => (
                <span key={i} style={{ '--a': `${i * 15}deg` } as CSSProperties} />
              ))}
            </div>
          ))}
        </div>
      )}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {FIREWORKS.map(([left, top, delay, colour, phone]) => (
          <div
            key={`${left}-${top}`}
            className={`diwali-firework ${phone ? '' : 'hidden sm:block'}`}
            style={{ left: `${left}%`, top: `${top}%`, '--t': `${delay}s`, '--c': colour } as CSSProperties}
          >
            {Array.from({ length: 14 }, (_, i) => (
              <span key={i} style={{ '--a': `${i * (360 / 14)}deg` } as CSSProperties} />
            ))}
          </div>
        ))}
        {SPARKS.map(([left, delay]) => (
          <span key={left} className="diwali-spark" style={{ left: `${left}%`, animationDelay: `${delay}s` }} />
        ))}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="relative text-center max-w-2xl mx-auto">
          {/* First thing in view, shown from the start: one tap plays the rockets with sound. */}
          <button
            type="button"
            onClick={playFireworks}
            className="diwali-sound inline-flex items-center gap-2 mb-6 px-5 py-2.5 rounded-full border border-champagne/60 bg-[#1B2A57] text-champagne text-sm font-bold shadow-lg shadow-black/30 hover:bg-[#24366B] transition-colors"
          >
            <Volume2 size={16} aria-hidden />
            {played ? 'Play fireworks again' : 'Tap for Diwali fireworks'}
          </button>
          <div className="relative w-fit mx-auto">
            <Diya className="diwali-hero-diya w-24 h-20 sm:w-28 sm:h-24" />
            <div className="diwali-burst" aria-hidden>
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i} style={{ '--a': `${i * 30}deg` } as CSSProperties} />
              ))}
            </div>
          </div>
          {TWINKLES.map(([top, left, size, delay]) => (
            <svg
              key={`${top}-${left}`}
              viewBox="0 0 24 24"
              className="diwali-twinkle"
              style={{ top: `${top}%`, left: `${left}%`, width: size, height: size, animationDelay: `${delay}s` }}
              aria-hidden
            >
              <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" fill="#FFE7B0" />
            </svg>
          ))}
          <p className="diwali-rise text-champagne text-xs sm:text-sm font-bold uppercase tracking-[0.3em] mt-4" style={{ '--d': '0.2s' } as CSSProperties}>
            Festival of lights
          </p>
          <h2 id="diwali-heading" aria-label={HEADING} className="font-headline font-extrabold text-5xl sm:text-7xl tracking-tight mt-3 leading-none">
            {HEADING.split('').map((ch, i) => (
              <span key={i} aria-hidden className="diwali-letter" style={{ '--d': `${0.35 + i * 0.06}s` } as CSSProperties}>
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </h2>
          <p className="diwali-rise text-white/85 text-base sm:text-lg mt-5" style={{ '--d': '1.1s' } as CSSProperties}>
            Warm wishes from all of us at DR Youth Clinic. Here are five simple ways to look after your skin through the celebrations.
          </p>
        </div>

        {/* On phones the cards swipe sideways like stories; a grid from tablet up. */}
        <ol className="diwali-track flex sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-12 sm:mt-16 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto sm:overflow-visible snap-x snap-mandatory [perspective:1000px]">
          {TIPS.map((tip, i) => (
            <li
              key={tip.title}
              onPointerMove={tilt}
              onPointerLeave={untilt}
              className="diwali-card relative rounded-3xl p-5 pt-6 flex flex-col shrink-0 w-[80%] sm:w-auto snap-center"
              style={{ '--d': `${1.3 + i * 0.22}s`, '--g1': tip.tone[0], '--g2': tip.tone[1], '--tint': tip.tone[2] } as CSSProperties}
            >
              <span className="diwali-card-foil" aria-hidden />
              <span className="diwali-card-num font-headline font-extrabold" aria-hidden>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="diwali-card-icon" aria-hidden>
                <tip.icon size={20} strokeWidth={1.6} />
              </span>
              <p className="diwali-card-label mt-4 text-[11px] font-bold uppercase tracking-[0.18em]">
                <span className="sr-only">Tip {i + 1}: </span>
                {tip.label}
              </p>
              <h3 className="text-white font-bold text-base leading-snug mt-1.5">{tip.title}</h3>
              <span className="diwali-card-rule" aria-hidden />
              <p className="text-white/80 text-sm leading-relaxed">{tip.body}</p>
            </li>
          ))}
        </ol>

        <div className="diwali-rise text-center mt-12" style={{ '--d': '2.6s' } as CSSProperties}>
          <p className="text-white font-headline text-xl sm:text-2xl font-bold">Wishing you a safe and bright Diwali.</p>
          <p className="text-white/70 text-sm mt-2">These are general tips. For advice about your own skin, talk to a dermatologist.</p>
          <Link href="/book" className="pmj-cta inline-flex items-center gap-2 mt-6 px-7 py-3 rounded-full font-bold text-primary">
            Ask our dermatologists
          </Link>
        </div>
      </div>
    </section>
  );
}
