'use client';

// A second question-screen style, alongside the plain list QuestionStep
// already uses for most questions — reserved for the handful of genuinely
// visual/diagnostic questions per assessment type (what's your main
// concern, what's your skin type) where a "the AI is reading this" visual
// metaphor earns its place. Every other question (duration, history,
// lifestyle, free text) stays the plain list — deliberately not applied
// everywhere, so it reads as meaningful rather than decorative.
export default function ScanPanel({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="relative w-full aspect-[4/3] sm:aspect-square rounded-3xl overflow-hidden bg-[#0B1220] shrink-0">
      {/* Grid-dot field — decorative, evokes a scan/analysis surface */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)',
          backgroundSize: '28px 28px, 28px 28px, 14px 14px',
          backgroundPosition: '0 0, 0 0, 7px 7px',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0B1220]" />

      {/* Scan ring + icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-24 h-24 sm:w-28 sm:h-28">
          <div className="absolute inset-0 rounded-full border-2 border-[#F5A623]/70 scanpanel-ring">
            <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#F5A623] shadow-[0_0_8px_2px_rgba(245,166,35,0.6)]" />
          </div>
          <div className="absolute inset-2 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center backdrop-blur-sm">
            <span className="text-3xl sm:text-4xl leading-none">{icon}</span>
          </div>
        </div>
      </div>

      {/* Sparkle badge, top-right */}
      <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#0B2560] border border-white/15 flex items-center justify-center">
        <span className="text-xs">✨</span>
      </div>

      {/* Status pill */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/40 border border-white/15 backdrop-blur-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/85 whitespace-nowrap">{label}</p>
      </div>

      <style jsx>{`
        .scanpanel-ring {
          animation: scanpanel-spin 3.5s linear infinite;
        }
        @keyframes scanpanel-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .scanpanel-ring { animation: none; }
        }
      `}</style>
    </div>
  );
}
