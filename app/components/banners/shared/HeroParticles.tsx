// CSS-only floating particle layer — no canvas library, fixed count, no
// per-frame JS. Each particle is one aria-hidden span with a slow CSS
// @keyframes float (see .hero-particle in globals.css). Renders nothing
// server-side when motionIntensity is "off" — OS prefers-reduced-motion
// is handled separately, in CSS (globals.css disables the animation
// entirely under that media query regardless of this prop), so this prop
// is only the admin-side dial, never a substitute for it.
const PARTICLES = [
  { top: "12%", left: "8%", size: 6, delay: 0 },
  { top: "22%", left: "85%", size: 4, delay: 1.2 },
  { top: "68%", left: "12%", size: 5, delay: 2.4 },
  { top: "80%", left: "78%", size: 7, delay: 0.6 },
  { top: "35%", left: "48%", size: 3, delay: 3.1 },
  { top: "55%", left: "92%", size: 5, delay: 1.8 },
  { top: "8%", left: "60%", size: 4, delay: 2.7 },
  { top: "90%", left: "40%", size: 6, delay: 0.9 },
];

export function HeroParticles({ intensity = "full" }: { intensity?: "full" | "reduced" | "off" }) {
  if (intensity === "off") return null;
  const particles = intensity === "reduced" ? PARTICLES.slice(0, 4) : PARTICLES;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((p, i) => (
        <span
          key={i}
          className="hero-particle absolute rounded-full"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            background: "var(--hero-particle)",
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
