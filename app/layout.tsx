import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import CacheGuard from "@/app/components/CacheGuard";
import { getAdsConfig } from "@/app/lib/adsConfig";
import { getAnalyticsConfig } from "@/app/lib/analyticsConfig";

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [adsConfig, analytics] = await Promise.all([getAdsConfig(), getAnalyticsConfig()]);
  const showAds = adsConfig.enabled && !adsConfig.testMode && adsConfig.publisherId;

  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#002045" />

        {/* Primary image CDN */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />

        {/* Google Maps */}
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="dns-prefetch" href="https://maps.googleapis.com" />

        {/* Google Review avatars */}
        <link rel="preconnect" href="https://lh3.googleusercontent.com" crossOrigin="anonymous" />

        {analytics.gtmId && (
          <link rel="preconnect" href="https://www.googletagmanager.com" />
        )}
        {analytics.ga4Id && (
          <link rel="preconnect" href="https://www.google-analytics.com" />
        )}
      </head>
      <body className="min-h-screen flex flex-col bg-[#f6faff]">

        {/* Google Tag Manager */}
        {analytics.gtmId && (
          <Script id="gtm" strategy="afterInteractive">{`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
            var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
            j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
            f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${analytics.gtmId}');
          `}</Script>
        )}

        {/* Google Analytics 4 (only if GTM not already loading it) */}
        {analytics.ga4Id && !analytics.gtmId && (
          <>
            <Script async src={`https://www.googletagmanager.com/gtag/js?id=${analytics.ga4Id}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">{`
              window.dataLayer=window.dataLayer||[];
              function gtag(){dataLayer.push(arguments);}
              gtag('js',new Date());
              gtag('config','${analytics.ga4Id}');
            `}</Script>
          </>
        )}

        {/* Meta (Facebook) Pixel */}
        {analytics.metaPixelId && (
          <Script id="meta-pixel" strategy="afterInteractive">{`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init','${analytics.metaPixelId}');fbq('track','PageView');
          `}</Script>
        )}

        {/* Microsoft Clarity */}
        {analytics.clarityId && (
          <Script id="clarity" strategy="afterInteractive">{`
            (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,
            document,"clarity","script","${analytics.clarityId}");
          `}</Script>
        )}

        {/* Hotjar */}
        {analytics.hotjarId && (
          <Script id="hotjar" strategy="afterInteractive">{`
            (function(h,o,t,j,a,r){h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
            h._hjSettings={hjid:${analytics.hotjarId},hjsv:6};a=o.getElementsByTagName('head')[0];
            r=o.createElement('script');r.async=1;r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
            a.appendChild(r);})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
          `}</Script>
        )}

        {/* Google AdSense */}
        {showAds && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsConfig.publisherId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}

        <CacheGuard />
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
