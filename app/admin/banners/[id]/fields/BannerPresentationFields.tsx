"use client";

import {
  SPLASH_ANIMATION_STYLES,
  SPLASH_ANIMATION_STYLE_LABELS,
  SPLASH_FREQUENCIES,
  SPLASH_FREQUENCY_LABELS,
  SPLASH_SOUND_EFFECTS,
  SPLASH_SOUND_EFFECT_LABELS,
} from "@/app/lib/banners/popupOptions";
import ImageUpload from "@/app/admin/components/ImageUpload";
import { Toggle, Input } from "./shared";

// Presentation & Animation — the Flash Offer Popup config, relocated here
// (Phase 3b) from inside "Where to Show"'s Homepage toggle, since this is
// a presentation concern, not a targeting one. Used to be meaningful only
// when showOnHomepage was on; the popup now works on any enabled "Where to
// Show" surface (homepage/location/service/category/landing page — see
// resolveBanner.ts and each page's own splash-mount call), so the hint
// below just checks that at least one is on, rather than homepage
// specifically. This tab shows the hint and leaves the config
// visible-but-inert until something is enabled under Where to Show, so
// nothing an admin already configured here is ever hidden or lost by
// switching tabs.
export default function BannerPresentationFields({
  banner, set, openAssetPicker,
}: {
  banner: any;
  set: (patch: Record<string, any>) => void;
  openAssetPicker: (assetType: "lottie" | "rive") => void;
}) {
  const hasAnyTargetSurface = !!(
    banner.showOnHomepage || banner.showOnLocationPage || banner.showOnServicePage ||
    banner.showOnCategoryPage || banner.showOnLandingPage
  );
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <p className="text-sm font-bold text-gray-700">Presentation</p>

      {!hasAnyTargetSurface && (
        <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          Flash Offer Popup needs at least one page enabled under the Where to Show tab first.
        </p>
      )}

      <Toggle
        checked={!!banner.splashEnabled}
        onChange={(v) => set({ splashEnabled: v })}
        label="✨ Flash Offer Popup — also show as a premium auto-closing popup on page load"
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
            label="Also show in normal banner rotation (uncheck to show ONLY as the popup)"
          />

          <div className="border-t border-gray-100 pt-3 space-y-2">
            <Toggle
              checked={!!banner.formEnabled}
              onChange={(v) => set({ formEnabled: v })}
              label="📝 Collect a lead directly in this popup (name + phone, no navigating away)"
            />
            {banner.formEnabled && (
              <div className="pl-4 space-y-2">
                <p className="text-[11px] text-gray-400">
                  The Call to Action tab's button is hidden while this is on — the visitor submits right here instead of clicking through.
                </p>
                <Toggle
                  checked={!!banner.formCollectEmail}
                  onChange={(v) => set({ formCollectEmail: v })}
                  label="Also ask for email (optional field)"
                />
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Success message</label>
                  <Input
                    value={banner.formSuccessMessage ?? "Thank you! We'll call you within 2 hours."}
                    onChange={(v) => set({ formSuccessMessage: v })}
                    placeholder="Thank you! We'll call you within 2 hours."
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-3 space-y-2">
            <p className="text-xs font-semibold text-gray-600">
              🎞️ Story Slides — swipeable, Instagram/WhatsApp-Stories-style (optional)
            </p>
            <p className="text-[11px] text-gray-400">
              Add 2 or more images to show them as swipeable slides instead of one static image — e.g. several before/after photos in one popup. Leave empty to use the single image set in the Media tab.
            </p>
            <div className="space-y-2">
              {(banner.storySlides || []).map((slide: any, i: number) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
                  <span className="text-xs text-gray-400 w-5 shrink-0 text-center">{i + 1}</span>
                  <div className="flex-1">
                    <ImageUpload
                      label={`Slide ${i + 1}`}
                      folder="dr-youth-clinic/banners"
                      currentPublicId={slide.publicId}
                      onUpload={(img) => {
                        const next = [...(banner.storySlides || [])];
                        next[i] = { ...next[i], ...img, type: "image" };
                        set({ storySlides: next });
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => set({ storySlides: (banner.storySlides || []).filter((_: any, j: number) => j !== i) })}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set({ storySlides: [...(banner.storySlides || []), { url: "", publicId: "", type: "image" }] })}
                className="text-xs font-bold text-[#0B2560] hover:text-[#1a3a6e]"
              >
                + Add a slide
              </button>
            </div>
          </div>

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
