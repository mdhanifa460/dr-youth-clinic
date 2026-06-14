import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://dryouthclinic.co.in";

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
  robots: {
    index: true,
    follow: true,
    nocache: false,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "DR Youth Clinic",
    title: "DR Youth Clinic - Premium Dermatology Services",
    description: "Advanced skin, hair, and laser treatments with expert dermatologists",
    images: [
      {
        url: `${SITE_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "DR Youth Clinic",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DR Youth Clinic",
    description: "Premium dermatology and aesthetic treatments",
    images: [`${SITE_URL}/twitter-image.jpg`],
  },
  alternates: {
    canonical: SITE_URL,
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="canonical" href={SITE_URL} />
        <meta name="theme-color" content="#1a365d" />
        <link rel="preconnect" href="https://dryouthclinic.co.in" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://lh3.googleusercontent.com" />
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
