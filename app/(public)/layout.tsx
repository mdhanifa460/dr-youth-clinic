import { unstable_cache } from "next/cache";
import Script from "next/script";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import TopBar from "@/app/components/homepage/TopBar";
import MobileStickyBar from "@/app/components/MobileStickyBar";
import AiChatWidget from "@/app/components/ai/AiChatWidget";
import MigrationSessionTracker from "@/app/components/MigrationSessionTracker";
import CustomEventListener from "@/app/components/analytics/CustomEventListener";
import { OrganizationSchema } from "@/app/components/SchemaMarkup";
import { connectDB } from "@/app/lib/mongodb";
import { HomepageSection } from "@/app/models/HomepageSection";
import { getSettings } from "@/app/models/Settings";
import { HOMEPAGE_DEFAULTS } from "@/app/lib/homepageDefaults";
import { getSiteConfig } from "@/app/lib/siteConfig";
import { SiteConfigProvider } from "@/app/components/SiteConfigContext";
import { getAnalyticsConfig } from "@/app/lib/analyticsConfig";

// Was an uncached connectDB()+getSettings() call in the root layout, run on
// EVERY request across the whole site (see app/layout.tsx's comment) — now
// scoped to public pages only and cached like every other settings-derived
// fetch in this file (getCachedAiConfig/getCachedNavItems), so it no longer
// blocks the render on a fresh Mongo round-trip per request.
const getCachedAnalyticsConfig = unstable_cache(
  getAnalyticsConfig,
  ["public-analytics-config"],
  { revalidate: 300, tags: ["settings"] }
);

const getCachedAiConfig = unstable_cache(
  async () => {
    try {
      await connectDB();
      const settings = await getSettings();
      return settings.ai ?? null;
    } catch {
      return null;
    }
  },
  ["public-ai-config"],
  { revalidate: 60, tags: ["settings"] }
);

const getCachedNavItems = unstable_cache(
  async () => {
    try {
      await connectDB();
      const settings = await getSettings();
      return settings.navigation?.items ?? [];
    } catch {
      return [];
    }
  },
  ["public-nav-items"],
  { revalidate: 60, tags: ["settings"] }
);

// Single query for both topbar + footer — avoids two round-trips per page
const getLayoutSections = unstable_cache(
  async () => {
    try {
      await connectDB();
      const sections = await HomepageSection.find({
        sectionKey: { $in: ["topbar", "footer"] },
      } as any).lean() as any[];

      const byKey = Object.fromEntries(sections.map((s) => [s.sectionKey, s]));
      return {
        topbar: {
          data: byKey.topbar?.data ?? HOMEPAGE_DEFAULTS.topbar.data,
          visible: byKey.topbar?.visible ?? true,
        },
        footer: byKey.footer?.data ?? HOMEPAGE_DEFAULTS.footer.data,
      };
    } catch {
      return {
        topbar: { data: HOMEPAGE_DEFAULTS.topbar.data, visible: true },
        footer: HOMEPAGE_DEFAULTS.footer.data,
      };
    }
  },
  ["layout-sections-v2"],
  { revalidate: 300, tags: ["homepage-layout"] }
);

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ topbar, footer }, siteConfig, aiConfig, navItems, analytics] = await Promise.all([
    getLayoutSections(),
    getSiteConfig(),
    getCachedAiConfig(),
    getCachedNavItems(),
    getCachedAnalyticsConfig(),
  ]);

  const whatsappLink = topbar.data?.socialLinks?.find(
    (s: any) => s.platform === "whatsapp"
  )?.url;

  return (
    <SiteConfigProvider initial={siteConfig}>
      {/* <link>/<meta> rendered anywhere in the tree get hoisted into <head>
          by Next.js — see app/layout.tsx's comment for why these moved out
          of the root layout instead of staying gated behind an isAdminPage
          check. This layout only wraps public routes, so no gate is needed. */}
      {analytics.gtmActive && (
        <link rel="preconnect" href="https://www.googletagmanager.com" />
      )}
      {analytics.ga4Id && !analytics.gtmActive && (
        <link rel="preconnect" href="https://www.google-analytics.com" />
      )}
      {analytics.metaPixelId && !analytics.gtmActive && (
        <link rel="preconnect" href="https://connect.facebook.net" />
      )}
      {analytics.searchConsoleId && (
        <meta name="google-site-verification" content={analytics.searchConsoleId} />
      )}

      {/* Google Tag Manager — the primary tracking layer. gtm_auth/
          gtm_preview only get appended when an admin has actually pointed
          this at a non-Live GTM environment/workspace; a normal production
          container ignores them if absent. */}
      {analytics.gtmActive && (
        <Script id="gtm" strategy="afterInteractive">{`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
          var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
          j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl${analytics.gtmAuth ? `+'&gtm_auth=${analytics.gtmAuth}'` : ''}${analytics.gtmPreview ? `+'&gtm_preview=${analytics.gtmPreview}&gtm_cookies_win=x'` : ''};
          f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${analytics.gtmId}');
        `}</Script>
      )}

      {/* Google Analytics 4 — advanced/fallback only, loaded directly ONLY
          when GTM isn't the active layer. When GTM is on, GA4 is expected
          to be configured as a tag inside the GTM container instead (see
          the admin page's "Managed by GTM" status). */}
      {analytics.ga4Id && !analytics.gtmActive && (
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

      {/* Meta (Facebook) Pixel — same rule as GA4 above; only loads when
          GTM isn't active, so a PageView never fires twice. */}
      {analytics.metaPixelId && !analytics.gtmActive && (
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

      <OrganizationSchema
        phone={siteConfig.publicPhone || undefined}
        instagramUrl={siteConfig.instagramUrl || undefined}
        facebookUrl={siteConfig.facebookUrl   || undefined}
        youtubeUrl={siteConfig.youtubeUrl     || undefined}
        schemaType={siteConfig.schemaType}
      />
      {topbar.visible && <TopBar data={topbar.data} siteConfig={siteConfig} />}
      <Navbar navItems={navItems as any} />
      <div className="mobile-sticky-offset lg:pb-0">{children}</div>
      <Footer data={footer} siteConfig={siteConfig} />
      <MobileStickyBar phone={topbar.data?.phone} whatsappUrl={whatsappLink} />
      <AiChatWidget config={aiConfig as any} whatsapp={siteConfig.publicWhatsApp} phone={siteConfig.publicPhone} />
      <MigrationSessionTracker />
      {/* Admin-configured Custom Events — fetches enabled events once and
          wires up click/visibility/page-view triggers, firing through the
          same pushDataLayerEvent() every predefined event already uses.
          Renders nothing; a no-op if no custom events exist. */}
      <CustomEventListener />
    </SiteConfigProvider>
  );
}
