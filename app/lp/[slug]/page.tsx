import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Script from 'next/script';
import { connectDB } from '@/app/lib/mongodb';
import { LandingPage } from '@/app/models/LandingPage';
import { getSiteConfig } from '@/app/lib/siteConfig';
import LpRenderer from '@/app/components/lp/LpRenderer';
import LpHeader from '@/app/components/lp/LpHeader';
import LpFooter from '@/app/components/lp/LpFooter';
import StickyCta from '@/app/components/lp/StickyCta';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');

interface Props {
  params: { slug: string };
  searchParams: { preview?: string };
}

async function getLP(slug: string, previewMode = false) {
  await connectDB();
  const query = previewMode
    ? { slug }
    : { slug, status: 'published' };
  const lp = await (LandingPage as any).findOne(query).lean() as any;
  return lp ? JSON.parse(JSON.stringify(lp)) : null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const isPreview = searchParams?.preview === '1';
  try {
    const lp = await getLP(params.slug, isPreview);
    if (!lp) return { title: 'Not Found' };

    const seo = lp.seo ?? {};
    return {
      title: seo.title || lp.title || 'DR Youth Clinic',
      description: seo.description || 'Expert skin, hair, and laser treatments at DR Youth Clinic.',
      keywords: seo.keywords || undefined,
      openGraph: seo.ogImage
        ? {
            title: seo.title || lp.title,
            description: seo.description,
            images: [{ url: seo.ogImage, width: 1200, height: 630, alt: seo.title || lp.title }],
          }
        : undefined,
      alternates: { canonical: `${SITE_URL}/lp/${params.slug}` },
      robots: { index: false, follow: false },
    };
  } catch {
    return { title: 'DR Youth Clinic' };
  }
}

export const dynamic = 'force-dynamic';

export default async function LandingPagePublic({ params, searchParams }: Props) {
  const isPreview = searchParams?.preview === '1';

  let lp: any = null;
  try {
    lp = await getLP(params.slug, isPreview);
  } catch (err) {
    console.error('[LP page] DB error for slug:', params.slug, err);
    notFound();
  }

  if (!lp) notFound();

  // Increment visitor count (published only — don't count preview visits)
  if (!isPreview && lp.status === 'published') {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    fetch(`${baseUrl}/api/lp/${params.slug}/visit`, { method: 'POST' }).catch(() => {});
  }

  const siteConfig = await getSiteConfig();
  const tracking = lp.tracking ?? {};
  const heroSection = lp.sections?.find((s: any) => s.type === 'hero');
  const heroData = heroSection?.data ?? {};
  const locationSection = lp.sections?.find((s: any) => s.type === 'location');
  const locationData = locationSection?.data ?? {};
  const phone = heroData.phone || siteConfig.publicPhone;
  const whatsapp = heroData.whatsapp || siteConfig.publicWhatsApp;

  return (
    <>
      {/* Draft preview banner */}
      {isPreview && lp.status !== 'published' && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 text-xs font-bold text-center py-2 px-4">
          ⚠️ PREVIEW — This page is in <span className="uppercase">{lp.status}</span> mode and not publicly visible
        </div>
      )}

      {/* LP-specific tracking scripts (skip in preview) */}
      {!isPreview && tracking.gtmId && (
        <Script id={`lp-gtm-${lp._id}`} strategy="afterInteractive">{`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
          var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
          j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
          f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${tracking.gtmId}');
        `}</Script>
      )}

      {!isPreview && tracking.metaPixelId && (
        <Script id={`lp-pixel-${lp._id}`} strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
          document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${tracking.metaPixelId}');fbq('track','PageView');
        `}</Script>
      )}

      {!isPreview && tracking.googleAdsId && (
        <>
          <Script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${tracking.googleAdsId}`}
            strategy="afterInteractive"
          />
          <Script id={`lp-gads-${lp._id}`} strategy="afterInteractive">{`
            window.dataLayer=window.dataLayer||[];
            function gtag(){dataLayer.push(arguments);}
            gtag('js',new Date());
            gtag('config','${tracking.googleAdsId}');
          `}</Script>
        </>
      )}

      <div className={`min-h-screen bg-white ${isPreview && lp.status !== 'published' ? 'pt-8' : ''}`}>
        <LpHeader
          phone={phone}
          whatsapp={whatsapp}
          ctaText={heroData.ctaPrimary?.text || 'Book Free Slot'}
        />

        <LpRenderer
          sections={lp.sections ?? []}
          form={lp.form ?? {
            fields: [],
            submitText: 'Book Free Consultation',
            successMessage: "Thank you! We'll call you within 2 hours.",
          }}
          slug={params.slug}
          variant="A"
        />

        <LpFooter phone={phone} whatsapp={whatsapp} city={locationData.city} branches={locationData.branches} />

        <StickyCta
          phone={phone}
          whatsapp={whatsapp}
          ctaText={heroData.ctaPrimary?.text || 'Book Free Consultation'}
        />

        <div className="h-16 lg:hidden" />
      </div>
    </>
  );
}
