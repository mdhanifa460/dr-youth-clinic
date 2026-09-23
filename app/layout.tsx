import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import CacheGuard from "@/app/components/CacheGuard";

// globals.css declares --font-body/--font-headline as "Inter"/"Manrope, Inter"
// but never actually loaded either — every browser fell through to its
// system font, silently. next/font self-hosts and preloads these at build
// time (no third-party request, no render-blocking Google Fonts link) and
// exposes them under the exact same CSS variable names those files already
// reference, so no other file needs to change.
const bodyFont = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const headlineFont = Manrope({ subsets: ["latin"], variable: "--font-headline", display: "swap" });

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL || 'https://dr-youth-clinic.vercel.app'),
  title: {
    default: "DR Youth Clinic - Dermatology & Skin Treatment",
    template: "%s | DR Youth Clinic",
  },
  description:
    "Premium dermatology clinic offering advanced skin, hair, and laser treatments. Expert care at multiple locations. Book your consultation today.",
  applicationName: "DR Youth Clinic",
  keywords: ["dermatology", "skin clinic", "hair treatment", "laser treatment", "aesthetic medicine"],
  authors: [{ name: "DR Youth Clinic" }],
  creator: "DR Youth Clinic",
  publisher: "DR Youth Clinic",
  robots: { index: true, follow: true, nocache: false },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "DR Youth Clinic",
    title: "DR Youth Clinic - Premium Dermatology Services",
    description: "Advanced skin, hair, and laser treatments with expert dermatologists",
    images: [{ url: `${SITE_URL}/og-image.jpg`, width: 1200, height: 630, alt: "DR Youth Clinic" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DR Youth Clinic",
    description: "Premium dermatology and aesthetic treatments",
    images: [`${SITE_URL}/twitter-image.jpg`],
  },
  alternates: { canonical: SITE_URL },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // Required for env(safe-area-inset-*) to work on iPhone notch/home-indicator
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Deliberately has NO dynamic function calls (headers()/cookies()) and no
  // per-request data fetch. This is the ONE layout every route in the app
  // renders through, so anything dynamic here forces every route — including
  // otherwise-static pages like the homepage and /blog — into full
  // per-request SSR, with no ISR/static caching, regardless of that page's
  // own `revalidate` export. (Confirmed empirically: `next build` showed "/"
  // and "/blog" as ƒ Dynamic while their `/[location]` and `/[location]/blog`
  // siblings, which don't sit under any headers()/cookies() call, came out ●
  // Static.) Analytics scripts used to live here gated by an isAdminPage
  // check read via headers() — moved to app/(public)/layout.tsx instead,
  // which only wraps public routes and so needs no such gate; app/admin
  // already has its own separate layout that never rendered them anyway.
  return (
    <html lang="en" className={`${bodyFont.variable} ${headlineFont.variable}`}>
      <head>
        <meta name="theme-color" content="#0B2560" />

        {/* Primary image CDN */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />

        {/* Google Maps */}
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="dns-prefetch" href="https://maps.googleapis.com" />

        {/* Google Review avatars */}
        <link rel="preconnect" href="https://lh3.googleusercontent.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen flex flex-col bg-[#f6faff]">
        <CacheGuard />
        {/* Visually hidden until focused — lets a keyboard user jump past the
            navbar straight to the page content instead of tabbing through
            every nav link and dropdown first. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-[#0B2560] focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold"
        >
          Skip to content
        </a>
        <main id="main-content" className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
