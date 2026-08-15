"use client";

import type { BannerTemplateType } from "@/app/lib/banners/types";
import { EXPERIENCE_PRESET_LIST } from "@/app/lib/banners/experiencePresets";
import { Toggle, PresetOverrideSelect, DAYS } from "./shared";

export default function BannerSmartRulesFields({
  banner, set, templateType, smartRulesEnabled, setSmartRulesEnabled,
}: {
  banner: any;
  set: (patch: Record<string, any>) => void;
  templateType: BannerTemplateType;
  smartRulesEnabled: boolean;
  setSmartRulesEnabled: (v: boolean) => void;
}) {
  const toggleDayOfWeek = (day: number) => {
    const rules = banner.smartRules || { daysOfWeek: [], timeWindowStart: null, timeWindowEnd: null, dateRangeStart: null, dateRangeEnd: null };
    const days = rules.daysOfWeek.includes(day) ? rules.daysOfWeek.filter((d: number) => d !== day) : [...rules.daysOfWeek, day];
    set({ smartRules: { ...rules, daysOfWeek: days } });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <Toggle checked={smartRulesEnabled} onChange={setSmartRulesEnabled} label="⚡ Smart Rules (day-of-week / time-of-day / festival date range)" />
      {smartRulesEnabled && (
        <div className="space-y-3 pt-1">
          <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">Times are evaluated in the server's timezone (UTC), not IST.</p>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Days of Week (leave all unchecked = every day)</label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDayOfWeek(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${(banner.smartRules?.daysOfWeek || []).includes(i) ? "bg-[#0B2560] text-white" : "bg-gray-100 text-gray-500"}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Time Window Start (optional)</label>
              <input type="time" value={banner.smartRules?.timeWindowStart || ""} onChange={(e) => set({ smartRules: { ...(banner.smartRules || {}), timeWindowStart: e.target.value || null } })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Time Window End (optional)</label>
              <input type="time" value={banner.smartRules?.timeWindowEnd || ""} onChange={(e) => set({ smartRules: { ...(banner.smartRules || {}), timeWindowEnd: e.target.value || null } })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Season (recurring every year — e.g. hot season = March-June)</label>
            <div className="grid grid-cols-2 gap-3">
              <select value={banner.smartRules?.seasonStartMonth || ""} onChange={(e) => set({ smartRules: { ...(banner.smartRules || {}), seasonStartMonth: e.target.value ? Number(e.target.value) : null } })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full">
                <option value="">Start month…</option>
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select value={banner.smartRules?.seasonEndMonth || ""} onChange={(e) => set({ smartRules: { ...(banner.smartRules || {}), seasonEndMonth: e.target.value ? Number(e.target.value) : null } })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full">
                <option value="">End month…</option>
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            {templateType === "glass-hero" && (
              <div className="mt-2">
                <PresetOverrideSelect
                  label="Seasonal Experience Preset (applies only during the season window above)"
                  value={banner.smartRules?.seasonalPresetOverride}
                  onChange={(v) => set({ smartRules: { ...(banner.smartRules || {}), seasonalPresetOverride: v } })}
                  options={EXPERIENCE_PRESET_LIST.map((p) => ({ value: p.id, label: p.label }))}
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Festival/Offer Start Date (optional)</label>
              <input type="date" value={banner.smartRules?.dateRangeStart ? banner.smartRules.dateRangeStart.slice(0, 10) : ""} onChange={(e) => set({ smartRules: { ...(banner.smartRules || {}), dateRangeStart: e.target.value || null } })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Festival/Offer End Date (optional)</label>
              <input type="date" value={banner.smartRules?.dateRangeEnd ? banner.smartRules.dateRangeEnd.slice(0, 10) : ""} onChange={(e) => set({ smartRules: { ...(banner.smartRules || {}), dateRangeEnd: e.target.value || null } })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
            </div>
          </div>
          {templateType === "glass-hero" && (
            <PresetOverrideSelect
              label="Campaign Experience Preset (applies only during the Festival/Offer dates above — wins over the seasonal preset if both are active)"
              value={banner.smartRules?.campaignPreset}
              onChange={(v) => set({ smartRules: { ...(banner.smartRules || {}), campaignPreset: v } })}
              options={EXPERIENCE_PRESET_LIST.map((p) => ({ value: p.id, label: p.label }))}
            />
          )}
        </div>
      )}
    </div>
  );
}
