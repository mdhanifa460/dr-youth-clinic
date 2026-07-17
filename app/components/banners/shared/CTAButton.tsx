import Link from "next/link";

// Matches app/components/homepage/HeroSection.tsx's two existing CTA button
// styles verbatim — banners must look like the rest of the site, not
// introduce a third visual style.
export default function CTAButton({
  label,
  href,
  variant = "primary",
}: {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
}) {
  if (!label || !href) return null;

  if (variant === "primary") {
    return (
      <Link
        href={href}
        className="min-h-12 w-full sm:w-auto bg-[#0B2560] text-white px-6 sm:px-8 py-3 rounded-xl font-semibold shadow-[0_10px_25px_rgba(11,37,96,0.25)] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(11,37,96,0.28)] transition-all duration-300 flex items-center justify-center gap-2"
      >
        {label}
        <span>→</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="min-h-12 w-full sm:w-auto bg-white border border-gray-300 text-[#0B2560] px-6 sm:px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300 flex items-center justify-center"
    >
      {label}
    </Link>
  );
}
