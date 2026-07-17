import { revalidateTag, revalidatePath } from "next/cache";
import { locations } from "@/app/data/locations";

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
export function revalidateBannerPaths(banner: { showOnLocationPage?: boolean; targetLocations?: string[] } | null | undefined) {
  revalidateTag("banners");
  revalidatePath("/");
  if (banner?.showOnLocationPage) {
    const cities = banner.targetLocations?.length ? banner.targetLocations : Object.keys(locations);
    for (const city of cities) revalidatePath(`/${city}`);
  }
}
