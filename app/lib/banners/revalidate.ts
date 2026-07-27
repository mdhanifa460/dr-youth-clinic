import { revalidateTag, revalidatePath } from "next/cache";
import { locations } from "@/app/data/locations";
import { CATEGORY_MAP } from "@/app/lib/serviceCategories";

// Shared by every admin banners route that mutates a document (create,
// update, status toggle, delete) — extracted so all four stay consistent
// instead of drifting (the status-toggle and delete routes previously only
// revalidated "/" and skipped the per-city paths that create/update already
// did, leaving a disabled/deleted location banner visible on its live page
// for up to the 300s ISR window instead of disappearing immediately).
//
// Service-page banners deliberately rely on that same 300s ISR window
// rather than being revalidated here — there's no cheap way to enumerate
// every service URL a banner might target, and a few minutes' propagation
// delay is an accepted tradeoff already used elsewhere for service content.
//
// Category-listing pages get the same explicit treatment as location pages
// (unlike service pages) because they ARE cheaply enumerable — only 4
// categories x N cities, unlike the unbounded set of individual services.
export function revalidateBannerPaths(
  banner: { showOnLocationPage?: boolean; targetLocations?: string[]; showOnCategoryPage?: boolean; targetCategories?: string[] } | null | undefined
) {
  revalidateTag("banners");
  revalidatePath("/");
  if (banner?.showOnLocationPage) {
    const cities = banner.targetLocations?.length ? banner.targetLocations : Object.keys(locations);
    for (const city of cities) revalidatePath(`/${city}`);
  }
  if (banner?.showOnCategoryPage) {
    const cities = banner.targetLocations?.length ? banner.targetLocations : Object.keys(locations);
    const categories = banner.targetCategories?.length ? banner.targetCategories : Object.keys(CATEGORY_MAP);
    for (const city of cities) {
      for (const category of categories) revalidatePath(`/${city}/services/${category}`);
    }
  }
}
