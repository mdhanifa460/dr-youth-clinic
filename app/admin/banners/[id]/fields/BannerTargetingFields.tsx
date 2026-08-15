"use client";

import { locations } from "@/app/data/locations";
import { CATEGORY_MAP } from "@/app/lib/serviceCategories";
import {
  SPLASH_ANIMATION_STYLES,
  SPLASH_ANIMATION_STYLE_LABELS,
  SPLASH_FREQUENCIES,
  SPLASH_FREQUENCY_LABELS,
  SPLASH_SOUND_EFFECTS,
  SPLASH_SOUND_EFFECT_LABELS,
} from "@/app/lib/banners/popupOptions";
import { Input, Toggle } from "./shared";

// "Where to Show" — targeting toggles, plus the Flash Offer Popup config
// block nested under Homepage (only meaningful when showOnHomepage is
// also on). openAssetPicker is passed through for the popup's optional
// Lottie animation picker, same "Pick from Animation Library" modal the
// glass-hero template's Advanced Customization section uses.
export default function BannerTargetingFields({
  banner, set, openAssetPicker,
}: {
  banner: any;
  set: (patch: Record<string, any>) => void;
  openAssetPicker: (assetType: "lottie" | "rive") => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <p className="text-sm font-bold text-gray-700">Where to Show</p>
      <Toggle checked={!!banner.showOnHomepage} onChange={(v) => set({ showOnHomepage: v })} label="Homepage" />
      {banner.showOnHomepage && (
        <div className="pl-4 space-y-2 border-l-2 border-gray-100">
          <Toggle
            checked={!!banner.splashEnabled}
            onChange={(v) => set({ splashEnabled: v })}
            label="✨ Flash Offer Popup — also show as a premium auto-closing popup on homepage load"
          />
          {banner.splashEnabled && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Auto-close after</label>
                <input
                  type="number" min={2} max={15}
                  value={banner.splashAutoCloseSeconds ?? 5}
                  onChange={(e) => set({ splashAutoCloseSeconds: Number(e.target.value) })}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm"
                />
                <span className="text-xs text-gray-500">seconds (visitor can also close it early)</span>
              </div>

              <Toggle
                checked={banner.splashShowCountdown !== false}
                onChange={(v) => set({ splashShowCountdown: v })}
                label="Show countdown ring"
              />

              <Toggle
                checked={banner.splashAlsoInRotation !== false}
                onChange={(v) => set({ splashAlsoInRotation: v })}
                label="Also show in normal homepage banner rotation (uncheck to show ONLY as the popup)"
              />

              <div className="space-y-1">
                <label className="text-xs text-gray-500">Popup frequency</label>
                <select
                  value={banner.splashFrequency || "once-per-session"}
                  onChange={(e) => set({ splashFrequency: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SPLASH_FREQUENCIES.map((f) => (
                    <option key={f} value={f}>{SPLASH_FREQUENCY_LABELS[f]}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500">Animation style</label>
                <select
                  value={banner.splashAnimationStyle || "sparkle"}
                  onChange={(e) => set({ splashAnimationStyle: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SPLASH_ANIMATION_STYLES.map((s) => (
                    <option key={s} value={s}>{SPLASH_ANIMATION_STYLE_LABELS[s]}</option>
                  ))}
                </select>
                {banner.splashAnimationStyle === "lottie" && (
                  <div className="flex items-center gap-2 pt-1">
                    <button type="button" onClick={() => openAssetPicker("lottie")} className="text-[11px] font-bold text-[#0B2560] hover:text-[#1a3a6e]">
                      {banner.lottieUrl ? "Change Animation" : "Select Animation"}
                    </button>
                    {banner.lottieUrl && <span className="text-[11px] text-gray-400 truncate max-w-[180px]">{banner.lottieUrl}</span>}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-xs">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Backdrop blur ({banner.splashBackdrop?.blur ?? 0}px)</label>
                  <input
                    type="range" min={0} max={20}
                    value={banner.splashBackdrop?.blur ?? 0}
                    onChange={(e) => set({ splashBackdrop: { ...(banner.splashBackdrop || {}), blur: Number(e.target.value) } })}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Backdrop darkness ({Math.round((banner.splashBackdrop?.darkness ?? 0.6) * 100)}%)</label>
                  <input
                    type="range" min={0} max={100}
                    value={Math.round((banner.splashBackdrop?.darkness ?? 0.6) * 100)}
                    onChange={(e) => set({ splashBackdrop: { ...(banner.splashBackdrop || {}), darkness: Number(e.target.value) / 100 } })}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <Toggle
                  checked={!!banner.splashSound?.enabled}
                  onChange={(v) => set({ splashSound: { ...(banner.splashSound || {}), enabled: v } })}
                  label="🔊 Sound — visitor taps a small speaker icon to hear it (never plays automatically)"
                />
                {banner.splashSound?.enabled && (
                  <select
                    value={banner.splashSound?.effect || "soft-chime"}
                    onChange={(e) => set({ splashSound: { ...(banner.splashSound || {}), effect: e.target.value } })}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SPLASH_SOUND_EFFECTS.map((s) => (
                      <option key={s} value={s}>{SPLASH_SOUND_EFFECT_LABELS[s]}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      <Toggle checked={!!banner.showOnLocationPage} onChange={(v) => set({ showOnLocationPage: v })} label="Location Pages" />
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
    </div>
  );
}
