import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

export const metadata: Metadata = {
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#002045" />

        {/* Primary image CDN — most critical preconnect on the site */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />

        {/* Google Maps (used in location pages) */}
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="dns-prefetch" href="https://maps.googleapis.com" />

        {/* Google Review avatars (loaded by TestimonialsSlider for google-source reviews) */}
        <link rel="preconnect" href="https://lh3.googleusercontent.com" crossOrigin="anonymous" />

        {/* Analytics — dns-prefetch only, connect happens on interaction */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
      <body className="min-h-screen flex flex-col bg-[#f6faff]">
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
