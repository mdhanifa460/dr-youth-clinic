// Flash Offer Popup sound — synthesized via the Web Audio API, zero audio
// assets, zero new dependencies, zero licensing concerns. Every effect is
// under 1s of actual tone (well under the "<1-2s" spec).
//
// AudioContext is constructed lazily, INSIDE playPopupSound() itself —
// never at module load, never in a useEffect — so no audio resource
// exists at all until the moment a sound would actually play. Every call
// site is a real click handler (see HomepageOfferSplash.tsx's 🔊 toggle
// and CTA click), which is what makes `ctx.resume()` reliable across
// browsers' autoplay-gesture requirements — this module is never called
// from anywhere else.
import type { SplashSoundEffect } from './popupOptions';

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!ctx) ctx = new AudioCtor();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// One sine oscillator with a short attack/decay gain envelope — a single
// clean "note," not a synth patch. `startAt` is seconds from now, `hold`
// is how long before the decay ramp begins.
function tone(audioCtx: AudioContext, freq: number, startAt: number, hold: number, decay: number, peakGain = 0.18) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const t0 = audioCtx.currentTime + startAt;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.02); // quick, non-clicky attack
  gain.gain.setValueAtTime(peakGain, t0 + hold);
  gain.gain.linearRampToValueAtTime(0, t0 + hold + decay);

  osc.start(t0);
  osc.stop(t0 + hold + decay + 0.05);
}

export function playPopupSound(effect: SplashSoundEffect): void {
  try {
    const audioCtx = getContext();
    if (!audioCtx) return;

    switch (effect) {
      case 'soft-chime':
        tone(audioCtx, 880, 0, 0.05, 0.55);
        break;
      case 'notification':
        tone(audioCtx, 660, 0, 0.05, 0.18);
        tone(audioCtx, 880, 0.14, 0.05, 0.28);
        break;
      case 'celebration':
        tone(audioCtx, 523.25, 0, 0.04, 0.16);
        tone(audioCtx, 659.25, 0.12, 0.04, 0.16);
        tone(audioCtx, 783.99, 0.24, 0.06, 0.5);
        break;
      default:
        // Unrecognized effect — silently no-op rather than guessing a sound.
        break;
    }
  } catch {
    // Sound is a nice-to-have accent, never allowed to break the popup
    // around it (e.g. a browser blocking AudioContext entirely).
  }
}
