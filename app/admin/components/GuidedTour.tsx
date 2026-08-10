"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

// Generic, reusable step-by-step spotlight tour — not tied to any one
// admin page. A consuming page marks its own fields with
// `data-tour="<id>"` and passes a `steps` list referencing those ids;
// this component only knows how to find, highlight, and describe an
// element, never anything about what the field means.
//
// Auto-starts once per browser (localStorage `tour-seen:<tourId>`) the
// first time a page mounts it, and stays replayable afterward via the
// imperative `start()` handle — a page typically wires that to its own
// "Replay Guide" button, since a one-time popup that never comes back is
// useless to someone who forgets a field's purpose three weeks later.

export interface TourStep {
  target: string; // matches an element's data-tour="<target>"
  title: string;
  description: string;
  example?: string;
}

export interface GuidedTourHandle {
  start: () => void;
}

interface GuidedTourProps {
  tourId: string;
  steps: TourStep[];
}

interface Rect { top: number; left: number; width: number; height: number }

const PAD = 8;

const GuidedTour = forwardRef<GuidedTourHandle, GuidedTourProps>(({ tourId, steps }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      if (!localStorage.getItem(`tour-seen:${tourId}`)) setIsOpen(true);
    } catch {
      // localStorage unavailable (private mode etc.) — just don't auto-start
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

  useImperativeHandle(ref, () => ({
    start: () => { setStepIndex(0); setIsOpen(true); },
  }));

  const measure = () => {
    const step = steps[stepIndex];
    if (!step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  };

  useEffect(() => {
    if (!isOpen) return;
    const step = steps[stepIndex];
    if (!step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: reducedMotion.current ? "auto" : "smooth", block: "center" });
    }
    const t = setTimeout(measure, reducedMotion.current ? 0 : 260);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stepIndex]);

  const close = () => {
    try { localStorage.setItem(`tour-seen:${tourId}`, "1"); } catch {}
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stepIndex]);

  if (!isOpen || !steps.length) return null;

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const next = () => (isLast ? close() : setStepIndex((i) => i + 1));
  const back = () => setStepIndex((i) => Math.max(0, i - 1));

  const box = rect
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : null;

  // Tooltip card: below the target by default, flips above if there isn't
  // room, clamped horizontally so it never runs off-screen.
  const cardWidth = 320;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1200;
  let cardTop = box ? box.top + box.height + 12 : viewportH / 2;
  let placeAbove = false;
  if (box && cardTop + 200 > viewportH) { cardTop = Math.max(12, box.top - 12); placeAbove = true; }
  const cardLeft = box ? Math.min(Math.max(12, box.left), viewportW - cardWidth - 12) : viewportW / 2 - cardWidth / 2;

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label={step.title}>
      {box ? (
        <div
          className="fixed rounded-xl pointer-events-none"
          style={{
            top: box.top, left: box.left, width: box.width, height: box.height,
            boxShadow: "0 0 0 9999px rgba(11,37,96,0.62)",
            transition: reducedMotion.current ? "none" : "all 0.25s ease",
            border: "2px solid #F5A623",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[#0B2560]/60" />
      )}

      <div
        className="fixed bg-white rounded-2xl shadow-2xl p-5"
        style={{
          top: placeAbove ? undefined : cardTop,
          bottom: placeAbove && box ? viewportH - box.top + 12 : undefined,
          left: cardLeft,
          width: cardWidth,
          transition: reducedMotion.current ? "none" : "top 0.25s ease, left 0.25s ease",
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#0B2560] uppercase tracking-wider">
            <Sparkles size={12} className="text-[#F5A623]" /> Step {stepIndex + 1} of {steps.length}
          </div>
          <button onClick={close} aria-label="Close guide" className="text-gray-300 hover:text-gray-500 shrink-0">
            <X size={16} />
          </button>
        </div>
        <h3 className="font-bold text-gray-900 text-sm mb-1.5">{step.title}</h3>
        <p className="text-xs text-gray-600 leading-relaxed">{step.description}</p>
        {step.example && (
          <div className="mt-2 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Example</p>
            <p className="text-[11px] font-mono text-gray-600">{step.example}</p>
          </div>
        )}
        <div className="flex items-center justify-between mt-4">
          <button onClick={close} className="text-[11px] text-gray-400 hover:text-gray-600 font-semibold">Skip guide</button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button onClick={back} className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 px-2.5 py-1.5">
                <ArrowLeft size={12} /> Back
              </button>
            )}
            <button onClick={next} className="flex items-center gap-1.5 bg-[#0B2560] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#0d2d72]">
              {isLast ? "Done" : "Next"} {!isLast && <ArrowRight size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

GuidedTour.displayName = "GuidedTour";
export default GuidedTour;
