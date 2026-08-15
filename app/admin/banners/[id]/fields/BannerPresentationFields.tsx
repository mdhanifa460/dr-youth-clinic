"use client";

import {
  SPLASH_ANIMATION_STYLES,
  SPLASH_ANIMATION_STYLE_LABELS,
  SPLASH_FREQUENCIES,
  SPLASH_FREQUENCY_LABELS,
  SPLASH_SOUND_EFFECTS,
  SPLASH_SOUND_EFFECT_LABELS,
} from "@/app/lib/banners/popupOptions";
import { Toggle } from "./shared";

// Presentation & Animation — the Flash Offer Popup config, relocated here
// (Phase 3b) from inside "Where to Show"'s Homepage toggle, since this is
// a presentation concern, not a targeting one. Still only meaningful when
// showOnHomepage is on — rather than re-nesting the whole block behind
// that toggle again (which would put it back in a targeting-owned tab),
// this tab shows an explanatory hint and leaves the config visible-but-
// inert until Homepage is enabled under Where to Show, so nothing an
// admin already configured here is ever hidden or lost by switching tabs.
export default function BannerPresentationFields({
  banner, set, openAssetPicker,
}: {
  banner: any;
  set: (patch: Record<string, any>) => void;
  openAssetPicker: (assetType: "lottie" | "rive") => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <p className="text-sm font-bold text-gray-700">Presentation</p>

      {!banner.showOnHomepage && (
        <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          Flash Offer Popup only shows on the homepage — enable "Homepage" under the Where to Show tab first.
        </p>
      )}

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
  );
}
