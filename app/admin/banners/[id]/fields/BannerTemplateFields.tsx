"use client";

import { Plus, X } from "lucide-react";
import type { BannerTemplateType } from "@/app/lib/banners/types";
import { HERO_THEMES } from "@/app/lib/banners/heroThemes";
import { EXPERIENCE_PRESET_LIST } from "@/app/lib/banners/experiencePresets";
import { Input, Toggle, ListEditor, PresetOverrideSelect, BoolOverrideSelect } from "./shared";

// Template-specific fields (premium-hero / service / doctor / glass-hero) —
// extracted verbatim from the single-page banner editor. glass-hero's
// block is the largest by far (Experience Preset picker, Advanced
// Customization incl. Lottie/Rive pickers, Statistics, Service Chips,
// Doctor Highlight, AI Assistant teaser) since it's the only template with
// the full Experience Engine.
export default function BannerTemplateFields({
  banner, set, templateType, doctors, experienceAdvanced, setExperienceAdvanced, openAssetPicker,
}: {
  banner: any;
  set: (patch: Record<string, any>) => void;
  templateType: BannerTemplateType;
  doctors: { _id: string; name: string; title: string }[];
  experienceAdvanced: boolean;
  setExperienceAdvanced: (v: boolean) => void;
  openAssetPicker: (assetType: "lottie" | "rive") => void;
}) {
  if (templateType === "premium-hero") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <p className="text-sm font-bold text-gray-700">Stat Badges</p>
        {(banner.statBadges || []).map((s: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={s.value} onChange={(v) => set({ statBadges: banner.statBadges.map((x: any, idx: number) => (idx === i ? { ...x, value: v } : x)) })} placeholder="20+" />
            <Input value={s.label} onChange={(v) => set({ statBadges: banner.statBadges.map((x: any, idx: number) => (idx === i ? { ...x, label: v } : x)) })} placeholder="Years Experience" />
            <button onClick={() => set({ statBadges: banner.statBadges.filter((_: any, idx: number) => idx !== i) })} className="text-red-400 hover:text-red-600 shrink-0"><X size={16} /></button>
          </div>
        ))}
        <button onClick={() => set({ statBadges: [...(banner.statBadges || []), { value: "", label: "" }] })} className="text-xs font-semibold text-[#0B2560] flex items-center gap-1"><Plus size={13} /> Add Stat</button>

        <p className="text-sm font-bold text-gray-700 pt-2">Trust Badges</p>
        {(banner.trustBadges || []).map((b: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={b.icon} onChange={(v) => set({ trustBadges: banner.trustBadges.map((x: any, idx: number) => (idx === i ? { ...x, icon: v } : x)) })} placeholder="✅" className="max-w-[70px]" />
            <Input value={b.text} onChange={(v) => set({ trustBadges: banner.trustBadges.map((x: any, idx: number) => (idx === i ? { ...x, text: v } : x)) })} placeholder="Certified Doctors" />
            <button onClick={() => set({ trustBadges: banner.trustBadges.filter((_: any, idx: number) => idx !== i) })} className="text-red-400 hover:text-red-600 shrink-0"><X size={16} /></button>
          </div>
        ))}
        <button onClick={() => set({ trustBadges: [...(banner.trustBadges || []), { icon: "✅", text: "" }] })} className="text-xs font-semibold text-[#0B2560] flex items-center gap-1"><Plus size={13} /> Add Trust Badge</button>

        <Toggle checked={!!banner.rating?.enabled} onChange={(v) => set({ rating: { ...banner.rating, enabled: v } })} label="Show star rating" />
        {banner.rating?.enabled && (
          <div className="grid grid-cols-2 gap-2">
            <Input value={String(banner.rating.value)} onChange={(v) => set({ rating: { ...banner.rating, value: Number(v) || 0 } })} placeholder="4.8" />
            <Input value={String(banner.rating.reviewCount)} onChange={(v) => set({ rating: { ...banner.rating, reviewCount: Number(v) || 0 } })} placeholder="1200" />
          </div>
        )}
      </div>
    );
  }

  if (templateType === "service") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
        <p className="text-sm font-bold text-gray-700">Benefits (bullet list)</p>
        <ListEditor items={banner.benefits || []} onChange={(v) => set({ benefits: v })} placeholder="Reduces Hair Fall" />
      </div>
    );
  }

  if (templateType === "doctor") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
        <p className="text-sm font-bold text-gray-700">Achievements (bullet list)</p>
        <ListEditor items={banner.achievements || []} onChange={(v) => set({ achievements: v })} placeholder="10,000+ Successful Surgeries" />
      </div>
    );
  }

  if (templateType !== "glass-hero") return null;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <p className="text-sm font-bold text-gray-700">✨ Experience Preset</p>
        <p className="text-xs text-gray-400">One choice sets the color palette, glass effect, glow, and motion together — no need to know how any of it works underneath.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {EXPERIENCE_PRESET_LIST.map((p) => {
            const active = (banner.experiencePreset || "luxury-glass") === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => set({ experiencePreset: p.id, motionIntensity: p.suggestedMotionIntensity })}
                className={`text-left rounded-xl border p-3 transition ${active ? "border-[#0B2560] bg-[#0B2560]/5 ring-1 ring-[#0B2560]" : "border-gray-200 hover:border-gray-300"}`}
              >
                <p className="text-xs font-bold text-gray-800">{p.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{p.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <Toggle checked={experienceAdvanced} onChange={setExperienceAdvanced} label="⚙️ Advanced Customization" />
        {experienceAdvanced && (
          <div className="space-y-3 pt-1">
            <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">Every field below is optional — leave on "Preset default" unless you specifically need to override it.</p>
            <div className="grid grid-cols-2 gap-3">
              <PresetOverrideSelect
                label="Color Theme"
                value={banner.experienceOverrides?.colorThemeOverride}
                onChange={(v) => set({ experienceOverrides: { ...(banner.experienceOverrides || {}), colorThemeOverride: v } })}
                options={HERO_THEMES.map((t) => ({ value: t.id, label: t.label }))}
              />
              <PresetOverrideSelect
                label="Glass Blur"
                value={banner.experienceOverrides?.glassBlur}
                onChange={(v) => set({ experienceOverrides: { ...(banner.experienceOverrides || {}), glassBlur: v } })}
                options={[{ value: "none", label: "None (flat card)" }, { value: "md", label: "Medium" }, { value: "xl", label: "Full glass" }]}
              />
              <PresetOverrideSelect
                label="Glow Intensity"
                value={banner.experienceOverrides?.glowIntensity}
                onChange={(v) => set({ experienceOverrides: { ...(banner.experienceOverrides || {}), glowIntensity: v } })}
                options={[{ value: "none", label: "None" }, { value: "soft", label: "Soft" }, { value: "strong", label: "Strong" }]}
              />
              <PresetOverrideSelect
                label="Entrance Animation"
                value={banner.experienceOverrides?.entranceAnimation}
                onChange={(v) => set({ experienceOverrides: { ...(banner.experienceOverrides || {}), entranceAnimation: v } })}
                options={[{ value: "none", label: "None" }, { value: "fade", label: "Fade" }, { value: "fade-rise", label: "Fade + Rise" }]}
              />
              <PresetOverrideSelect
                label="Idle Animation"
                value={banner.experienceOverrides?.idleAnimation}
                onChange={(v) => set({ experienceOverrides: { ...(banner.experienceOverrides || {}), idleAnimation: v } })}
                options={[{ value: "none", label: "None (static)" }, { value: "drift", label: "Gradient Drift" }, { value: "pulse", label: "Glow Pulse" }]}
              />
              <PresetOverrideSelect
                label="Animation Speed"
                value={banner.experienceOverrides?.animationSpeed}
                onChange={(v) => set({ experienceOverrides: { ...(banner.experienceOverrides || {}), animationSpeed: v } })}
                options={[{ value: "slow", label: "Slow" }, { value: "normal", label: "Normal" }, { value: "fast", label: "Fast" }]}
              />
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Particle Density</label>
                <select value={banner.motionIntensity || "full"} onChange={(e) => set({ motionIntensity: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full">
                  <option value="full">Full</option>
                  <option value="reduced">Reduced</option>
                  <option value="off">Off</option>
                </select>
              </div>
              <BoolOverrideSelect
                label="Parallax"
                value={banner.experienceOverrides?.parallax}
                onChange={(v) => set({ experienceOverrides: { ...(banner.experienceOverrides || {}), parallax: v } })}
              />
              <BoolOverrideSelect
                label="Scroll Effects"
                value={banner.experienceOverrides?.scrollEffects}
                onChange={(v) => set({ experienceOverrides: { ...(banner.experienceOverrides || {}), scrollEffects: v } })}
              />
            </div>
            <p className="text-[11px] text-gray-400">A visitor's own device "reduce motion" setting always overrides every animation above.</p>

            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-gray-500">Lottie Animation (optional)</p>
                <button type="button" onClick={() => openAssetPicker("lottie")} className="text-[11px] font-bold text-[#0B2560] hover:text-[#1a3a6e]">
                  📚 Pick from Library
                </button>
              </div>
              <Input value={banner.lottieUrl || ""} onChange={(v) => set({ lottieUrl: v })} placeholder="https://.../animation.json" />
              {banner.lottieUrl && (
                <select value={banner.lottiePlacement || "beside-heading"} onChange={(e) => set({ lottiePlacement: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full mt-2">
                  <option value="beside-heading">Beside the subtitle badge</option>
                  <option value="background">Full background</option>
                  <option value="floating-badge">Floating corner badge</option>
                </select>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-gray-500">Rive Animation (optional)</p>
                <button type="button" onClick={() => openAssetPicker("rive")} className="text-[11px] font-bold text-[#0B2560] hover:text-[#1a3a6e]">
                  📚 Pick from Library
                </button>
              </div>
              <Input value={banner.riveUrl || ""} onChange={(v) => set({ riveUrl: v })} placeholder="https://.../animation.riv" />
              {banner.riveUrl && (
                <select value={banner.rivePlacement || "beside-heading"} onChange={(e) => set({ rivePlacement: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full mt-2">
                  <option value="beside-heading">Beside the subtitle badge</option>
                  <option value="background">Full background</option>
                  <option value="floating-badge">Floating corner badge</option>
                </select>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <p className="text-sm font-bold text-gray-700">Statistics</p>
        {(banner.statBadges || []).map((s: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={s.value} onChange={(v) => set({ statBadges: banner.statBadges.map((x: any, idx: number) => (idx === i ? { ...x, value: v } : x)) })} placeholder="15,000+" />
            <Input value={s.label} onChange={(v) => set({ statBadges: banner.statBadges.map((x: any, idx: number) => (idx === i ? { ...x, label: v } : x)) })} placeholder="Happy Patients" />
            <button onClick={() => set({ statBadges: banner.statBadges.filter((_: any, idx: number) => idx !== i) })} className="text-red-400 hover:text-red-600 shrink-0"><X size={16} /></button>
          </div>
        ))}
        <button onClick={() => set({ statBadges: [...(banner.statBadges || []), { value: "", label: "" }] })} className="text-xs font-semibold text-[#0B2560] flex items-center gap-1"><Plus size={13} /> Add Stat</button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <p className="text-sm font-bold text-gray-700">Service Chips</p>
        {(banner.serviceChips || []).map((c: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={c.icon} onChange={(v) => set({ serviceChips: banner.serviceChips.map((x: any, idx: number) => (idx === i ? { ...x, icon: v } : x)) })} placeholder="💆" className="max-w-[60px]" />
            <Input value={c.label} onChange={(v) => set({ serviceChips: banner.serviceChips.map((x: any, idx: number) => (idx === i ? { ...x, label: v } : x)) })} placeholder="Hair" />
            <Input value={c.href} onChange={(v) => set({ serviceChips: banner.serviceChips.map((x: any, idx: number) => (idx === i ? { ...x, href: v } : x)) })} placeholder="/chennai/services/hair" />
            <button onClick={() => set({ serviceChips: banner.serviceChips.filter((_: any, idx: number) => idx !== i) })} className="text-red-400 hover:text-red-600 shrink-0"><X size={16} /></button>
          </div>
        ))}
        <button onClick={() => set({ serviceChips: [...(banner.serviceChips || []), { icon: "✨", label: "", href: "" }] })} className="text-xs font-semibold text-[#0B2560] flex items-center gap-1"><Plus size={13} /> Add Chip</button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <p className="text-sm font-bold text-gray-700">Doctor Highlight (optional)</p>
        <select
          value={banner.doctorHighlight?.doctorId?._id || banner.doctorHighlight?.doctorId || ""}
          onChange={(e) => set({ doctorHighlight: { ...banner.doctorHighlight, doctorId: e.target.value || null } })}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full"
        >
          <option value="">None</option>
          {doctors.map((d) => (
            <option key={d._id} value={d._id}>{d.name} — {d.title}</option>
          ))}
        </select>
        {(banner.doctorHighlight?.doctorId?._id || banner.doctorHighlight?.doctorId) && (
          <Input
            value={banner.doctorHighlight?.tagline || ""}
            onChange={(v) => set({ doctorHighlight: { ...banner.doctorHighlight, tagline: v } })}
            placeholder="Tagline override (optional — defaults to their title)"
          />
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <Toggle checked={!!banner.assistantTeaser?.enabled} onChange={(v) => set({ assistantTeaser: { ...banner.assistantTeaser, enabled: v } })} label="👋 Show AI Assistant teaser card" />
        {banner.assistantTeaser?.enabled && (
          <>
            <Input value={banner.assistantTeaser?.text || ""} onChange={(v) => set({ assistantTeaser: { ...banner.assistantTeaser, text: v } })} placeholder="Need help choosing a treatment?" />
            <div className="grid grid-cols-2 gap-2">
              <Input value={banner.assistantTeaser?.ctaLabel || ""} onChange={(v) => set({ assistantTeaser: { ...banner.assistantTeaser, ctaLabel: v } })} placeholder="Start Assessment" />
              <Input value={banner.assistantTeaser?.href || ""} onChange={(v) => set({ assistantTeaser: { ...banner.assistantTeaser, href: v } })} placeholder="/skin-quiz" />
            </div>
          </>
        )}
      </div>
    </>
  );
}
