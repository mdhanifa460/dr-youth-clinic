"use client";

// Small reusable inputs shared across every extracted banner-editor
// section (same pattern as app/admin/ai-assessment/page.tsx) — moved here
// verbatim from the single-page editor during the Phase 3 tab
// reorganization so every section component can import the same
// primitives instead of redefining them.
import { Plus, X } from "lucide-react";

export function Input({ value, onChange, placeholder, className = "" }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full ${className}`}
    />
  );
}

export function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full resize-none"
    />
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between py-2.5 cursor-pointer">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition relative shrink-0 ${checked ? "bg-[#0B2560]" : "bg-gray-200"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

export function ListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={item} onChange={(v) => onChange(items.map((x, idx) => (idx === i ? v : x)))} placeholder={placeholder} />
          <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 shrink-0">
            <X size={16} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className="text-xs font-semibold text-[#0B2560] hover:text-[#1a3a6e] flex items-center gap-1">
        <Plus size={13} /> Add
      </button>
    </div>
  );
}

// Tri-state select for an Advanced Mode override field that can also
// legitimately be "unset" (inherit the Experience Preset's own value) —
// a plain Toggle can't express that third state, only on/off.
export function PresetOverrideSelect({
  label, value, onChange, options,
}: {
  label: string; value: string | null | undefined; onChange: (v: string | null) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full"
      >
        <option value="">Preset default</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// Same tri-state idea as PresetOverrideSelect, for boolean override fields
// (parallax/scrollEffects) where "inherit from preset" must be
// distinguishable from an explicit "off".
export function BoolOverrideSelect({ label, value, onChange }: { label: string; value: boolean | null | undefined; onChange: (v: boolean | null) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
      <select
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value === "true")}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full"
      >
        <option value="">Preset default</option>
        <option value="true">On</option>
        <option value="false">Off</option>
      </select>
    </div>
  );
}

export function CTAFields({ label, cta, onChange }: { label: string; cta: { label: string; href: string }; onChange: (v: { label: string; href: string }) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        <Input value={cta?.label || ""} onChange={(v) => onChange({ ...cta, label: v })} placeholder="Button text" />
        <Input value={cta?.href || ""} onChange={(v) => onChange({ ...cta, href: v })} placeholder="/book" />
      </div>
    </div>
  );
}

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
