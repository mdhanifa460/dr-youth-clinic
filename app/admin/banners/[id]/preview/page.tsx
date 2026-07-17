import { notFound } from "next/navigation";
import { connectDB } from "@/app/lib/mongodb";
import { Banner } from "@/app/models/Banner";
import { requirePermission } from "@/app/lib/adminAuth";
import BannerRenderer from "@/app/components/banners/BannerRenderer";
import type { BannerDoc } from "@/app/lib/banners/types";

// Server-renders just the banner, standalone, at whatever width the admin's
// browser tab is — no custom device-frame simulator, since resizing a real
// browser tab already covers desktop/tablet/mobile preview needs.
export default async function BannerPreviewPage({ params }: { params: { id: string } }) {
  const denied = await requirePermission("banners", "view");
  if (denied) notFound();

  await connectDB();
  const banner = await (Banner as any).findById(params.id).lean();
  if (!banner) notFound();

  return (
    <div>
      <div className="bg-amber-50 border-b border-amber-200 text-amber-700 text-xs font-semibold text-center py-2">
        Preview only — resize this window to check tablet/mobile breakpoints.
      </div>
      <BannerRenderer banner={JSON.parse(JSON.stringify(banner)) as BannerDoc} />
    </div>
  );
}
