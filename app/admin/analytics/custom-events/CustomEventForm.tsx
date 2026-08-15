"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader, Plus, X, Info } from "lucide-react";
import {
  CUSTOM_EVENT_TRIGGER_TYPES,
  CUSTOM_EVENT_TRIGGER_TYPE_LABELS,
  CUSTOM_EVENT_TRIGGER_TYPES_NEEDING_ELEMENT_ID,
  CUSTOM_EVENT_PARAM_SOURCES,
  CUSTOM_EVENT_PARAM_SOURCE_LABELS,
  type CustomEventTriggerType,
  type CustomEventParamSource,
} from "@/app/lib/analytics/customEventOptions";

export interface CustomEventFormValue {
  _id?: string;
  name: string;
  displayName: string;
  description: string;
  triggerType: CustomEventTriggerType;
  elementId: string;
  pagePath: string;
  parameters: { name: string; source: CustomEventParamSource; value: string }[];
  enabled: boolean;
  isKeyEvent: boolean;
}

const EMPTY: CustomEventFormValue = {
  name: "",
  displayName: "",
  description: "",
  triggerType: "cta_click",
  elementId: "",
  pagePath: "",
  parameters: [],
  enabled: false,
  isKeyEvent: false,
};

export default function CustomEventForm({ initial, mode }: { initial?: Partial<CustomEventFormValue>; mode: "new" | "edit" }) {
  const router = useRouter();
  const [value, setValue] = useState<CustomEventFormValue>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (patch: Partial<CustomEventFormValue>) => setValue((v) => ({ ...v, ...patch }));
  const needsElementId = CUSTOM_EVENT_TRIGGER_TYPES_NEEDING_ELEMENT_ID.includes(value.triggerType);
  const isPageView = value.triggerType === "page_view";

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const url = mode === "new" ? "/api/admin/analytics/custom-events" : `/api/admin/analytics/custom-events/${value._id}`;
      const res = await fetch(url, {
        method: mode === "new" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      router.push("/admin/analytics");
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <h1 className="text-xl font-bold text-gray-900">{mode === "new" ? "New Custom Event" : "Edit Custom Event"}</h1>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">
            Event Name {mode === "edit" && <span className="font-normal text-gray-400">(locked after creation)</span>}
          </label>
          <input
            value={value.name}
            onChange={(e) => set({ name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
            disabled={mode === "edit"}
            placeholder="flash_offer_cta_click"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <p className="text-[11px] text-gray-400 mt-1">lowercase_snake_case only — this is the exact name pushed to the dataLayer, referenced by any GTM trigger you build against it.</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Display Name</label>
          <input
            value={value.displayName}
            onChange={(e) => set({ displayName: e.target.value })}
            placeholder="Flash Offer CTA Click"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
          <textarea
            value={value.description}
            onChange={(e) => set({ description: e.target.value })}
            rows={2}
            placeholder="User clicked the CTA on the flash offer popup."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Trigger</label>
          <select
            value={value.triggerType}
            onChange={(e) => set({ triggerType: e.target.value as CustomEventTriggerType })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CUSTOM_EVENT_TRIGGER_TYPES.map((t) => (
              <option key={t} value={t}>{CUSTOM_EVENT_TRIGGER_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        {needsElementId && (
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Element ID</label>
            <input
              value={value.elementId}
              onChange={(e) => set({ elementId: e.target.value })}
              placeholder="flash-offer-book-now"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-gray-400 mt-1 flex items-start gap-1"><Info size={12} className="shrink-0 mt-0.5" /> Must exactly match the element's id="..." attribute in the page's HTML — ask a developer if you're not sure what it is.</p>
          </div>
        )}

        {isPageView && (
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Page Path</label>
            <input
              value={value.pagePath}
              onChange={(e) => set({ pagePath: e.target.value })}
              placeholder="/offers (leave blank for every page)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-700">Parameters</p>
          <button
            type="button"
            onClick={() => set({ parameters: [...value.parameters, { name: "", source: "static", value: "" }] })}
            className="text-xs font-semibold text-[#0B2560] flex items-center gap-1 hover:underline"
          >
            <Plus size={13} /> Add Parameter
          </button>
        </div>
        <p className="text-[11px] text-gray-400">Never use a parameter for a patient's name, phone, email, or medical details — those are rejected automatically. Use ids/categories instead (e.g. service, branch, offer_id).</p>
        {value.parameters.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={p.name}
              onChange={(e) => set({ parameters: value.parameters.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)) })}
              placeholder="offer_id"
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none"
            />
            <select
              value={p.source}
              onChange={(e) => set({ parameters: value.parameters.map((x, idx) => (idx === i ? { ...x, source: e.target.value as CustomEventParamSource } : x)) })}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
            >
              {CUSTOM_EVENT_PARAM_SOURCES.map((s) => (
                <option key={s} value={s}>{CUSTOM_EVENT_PARAM_SOURCE_LABELS[s]}</option>
              ))}
            </select>
            <input
              value={p.value}
              onChange={(e) => set({ parameters: value.parameters.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)) })}
              placeholder={p.source === "static" ? "chennai" : "offerId"}
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none"
            />
            <button type="button" onClick={() => set({ parameters: value.parameters.filter((_, idx) => idx !== i) })} className="text-red-400 hover:text-red-600 shrink-0">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <label className="flex items-center justify-between py-1 cursor-pointer">
          <span className="text-sm text-gray-700">Enabled</span>
          <button type="button" onClick={() => set({ enabled: !value.enabled })}
            className={`w-11 h-6 rounded-full transition relative shrink-0 ${value.enabled ? "bg-[#0B2560]" : "bg-gray-200"}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </label>
        <label className="flex items-center justify-between py-1 cursor-pointer">
          <span className="text-sm text-gray-700">⭐ GA4 Key Event</span>
          <button type="button" onClick={() => set({ isKeyEvent: !value.isKeyEvent })}
            className={`w-11 h-6 rounded-full transition relative shrink-0 ${value.isKeyEvent ? "bg-[#0B2560]" : "bg-gray-200"}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value.isKeyEvent ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </label>
        <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          Marking this doesn't create a GA4 conversion by itself — it adds an <code className="font-mono">is_key_event</code> parameter you can use in a GTM trigger. You still need to mark it as a Key Event inside GA4's own console.
        </p>
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving || !value.name || !value.displayName}
          className="flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition disabled:opacity-50">
          {saving ? <Loader size={14} className="animate-spin" /> : null}
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
