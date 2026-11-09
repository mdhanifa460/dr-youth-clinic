"use client";

import { locations } from "@/app/data/locations";
import { CATEGORY_MAP } from "@/app/lib/serviceCategories";
import { Input, Toggle } from "./shared";

// "Where to Show" — page targeting toggles. The Flash Offer Popup config
// that used to live nested under Homepage here now lives in its own
// Presentation & Animation tab (BannerPresentationFields.tsx) — a
// presentation concern, not a targeting one.
export default function BannerTargetingFields({ banner, set }: { banner: any; set: (patch: Record<string, any>) => void }) {
  // A spotlight only appears on the homepage and city (branch) pages.
  const spotlight = banner.templateType === "spotlight";
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <p className="text-sm font-bold text-gray-700">Where to Show</p>
      {spotlight && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          A spotlight shows above the banners on the homepage and/or the city pages. The homepage is the same for every visitor,
          so for a single-branch offer, leave Homepage off and tick only that city below.
        </p>
      )}
      <Toggle checked={!!banner.showOnHomepage} onChange={(v) => set({ showOnHomepage: v })} label={spotlight ? "Homepage (everyone)" : "Homepage"} />
      <Toggle checked={!!banner.showOnLocationPage} onChange={(v) => set({ showOnLocationPage: v })} label={spotlight ? "City / branch pages (e.g. /kochi)" : "Location Pages"} />
      {banner.showOnLocationPage && (
        <div className="pl-4 space-y-1.5">
          <p className="text-xs text-gray-400">Leave all unchecked to show on every location.</p>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(locations).map(([key, loc]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={(banner.targetLocations || []).includes(key)}
                  onChange={(e) => {
                    const next = e.target.checked ? [...(banner.targetLocations || []), key] : (banner.targetLocations || []).filter((x: string) => x !== key);
                    set({ targetLocations: next });
                  }}
                />
                {loc.name}
              </label>
            ))}
          </div>
        </div>
      )}
      {!spotlight && (<>
      <Toggle checked={!!banner.showOnServicePage} onChange={(v) => set({ showOnServicePage: v })} label="Service Pages" />
      {banner.showOnServicePage && (
        <div className="pl-4">
          <p className="text-xs text-gray-400 mb-1.5">Leave blank to show on every service. Enter service URL slugs, comma-separated.</p>
          <Input
            value={(banner.targetServices || []).join(", ")}
            onChange={(v) => set({ targetServices: v.split(",").map((x) => x.trim()).filter(Boolean) })}
            placeholder="e.g. prp-hair-treatment, laser-hair-removal"
          />
        </div>
      )}
      <Toggle checked={!!banner.showOnCategoryPage} onChange={(v) => set({ showOnCategoryPage: v })} label="Category Listing Pages (e.g. /chennai/services/hair)" />
      {banner.showOnCategoryPage && (
        <div className="pl-4 space-y-1.5">
          <p className="text-xs text-gray-400">Leave all unchecked to show on every category.</p>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(CATEGORY_MAP).map(([slug, label]) => (
              <label key={slug} className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={(banner.targetCategories || []).includes(slug)}
                  onChange={(e) => {
                    const next = e.target.checked ? [...(banner.targetCategories || []), slug] : (banner.targetCategories || []).filter((x: string) => x !== slug);
                    set({ targetCategories: next });
                  }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}
      <Toggle checked={!!banner.showOnLandingPage} onChange={(v) => set({ showOnLandingPage: v })} label="Landing Pages (campaign pages, e.g. /lp/bangalore-hair-transplant)" />
      {banner.showOnLandingPage && (
        <div className="pl-4">
          <p className="text-xs text-gray-400 mb-1.5">Leave blank to show on every landing page. Enter LP URL slugs, comma-separated.</p>
          <Input
            value={(banner.targetLandingPages || []).join(", ")}
            onChange={(v) => set({ targetLandingPages: v.split(",").map((x) => x.trim()).filter(Boolean) })}
            placeholder="e.g. bangalore-hair-transplant, chennai-skin-glow"
          />
        </div>
      )}
      </>)}
    </div>
  );
}
