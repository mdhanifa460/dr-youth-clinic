import type { BannerDoc } from "@/app/lib/banners/types";

// Renders as an absolutely-positioned layer inside a `relative` image
// container — was previously modeled in the schema/admin form but never
// actually consumed by any template, so enabling it had no visible effect.
export default function ImageOverlay({ overlay }: { overlay: BannerDoc["overlay"] | undefined }) {
  if (!overlay?.enabled) return null;

  const background =
    overlay.style === "gradient"
      ? `linear-gradient(to top, rgba(11,37,96,${overlay.opacity}), transparent)`
      : `rgba(11,37,96,${overlay.opacity})`;

  return <div className="absolute inset-0 pointer-events-none rounded-[inherit]" style={{ background }} />;
}
