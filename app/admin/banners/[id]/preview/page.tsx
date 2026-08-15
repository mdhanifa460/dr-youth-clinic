import { notFound } from "next/navigation";
import { connectDB } from "@/app/lib/mongodb";
import { Banner } from "@/app/models/Banner";
import { requirePermission } from "@/app/lib/adminAuth";
import BannerRenderer from "@/app/components/banners/BannerRenderer";
import HomepageOfferSplash from "@/app/components/banners/HomepageOfferSplash";
import type { BannerDoc } from "@/app/lib/banners/types";
import PreviewFrame from "./PreviewFrame";

// Server-renders the banner, plus (when splashEnabled) the Flash Offer
// Popup forced open on top of it, inside a desktop/mobile device-frame
// toggle (PreviewFrame.tsx). Read-only — only ever a .lean() find, no
// write path exists on this page.
export default async function BannerPreviewPage({ params }: { params: { id: string } }) {
  const denied = await requirePermission("banners", "view");
  if (denied) notFound();

  await connectDB();
  const banner = await (Banner as any).findById(params.id).lean();
  if (!banner) notFound();

  const bannerDoc = JSON.parse(JSON.stringify(banner)) as BannerDoc;

  return (
    <PreviewFrame>
      <BannerRenderer banner={bannerDoc} />
      {bannerDoc.splashEnabled && <HomepageOfferSplash banner={bannerDoc} forcePreview />}
    </PreviewFrame>
  );
}
