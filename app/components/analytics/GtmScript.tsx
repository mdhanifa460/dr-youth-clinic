import Script from "next/script";
import type { AnalyticsConfig } from "@/app/lib/analyticsConfig";

// The one Google Tag Manager loader every public surface renders — shared by
// app/(public)/layout.tsx and app/lp/[slug]/page.tsx. LPs sit outside the
// (public) route group, so they never inherited the layout's copy; keeping a
// single component means the two can't drift apart again. gtm_auth/
// gtm_preview only get appended when an admin has actually pointed this at a
// non-Live GTM environment/workspace; a normal production container ignores
// them if absent. Renders nothing unless GTM is enabled and has an ID.
export default function GtmScript({ analytics }: { analytics: Pick<AnalyticsConfig, "gtmActive" | "gtmId" | "gtmAuth" | "gtmPreview"> }) {
  if (!analytics.gtmActive) return null;
  return (
    <Script id="gtm" strategy="afterInteractive">{`
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
      var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
      j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl${analytics.gtmAuth ? `+'&gtm_auth=${analytics.gtmAuth}'` : ''}${analytics.gtmPreview ? `+'&gtm_preview=${analytics.gtmPreview}&gtm_cookies_win=x'` : ''};
      f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${analytics.gtmId}');
    `}</Script>
  );
}
