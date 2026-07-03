"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Save } from "lucide-react";

type ServiceFormSettings = {
  showNarrative: boolean;
  showBenefits: boolean;
  showHeroImage: boolean;
  showBeforeAfter: boolean;
  showSeoSection: boolean;
  showKeywordSuggestions: boolean;
  defaultStatus: "active" | "draft";
  defaultDuration: number;
  defaultCurrency: string;
};

const DEFAULTS: ServiceFormSettings = {
  showNarrative: true,
  showBenefits: true,
  showHeroImage: true,
  showBeforeAfter: true,
  showSeoSection: true,
  showKeywordSuggestions: true,
  defaultStatus: "active",
  defaultDuration: 60,
  defaultCurrency: "INR",
};

const TOGGLES: { key: keyof ServiceFormSettings; label: string; desc: string }[] = [
  {
    key: "showNarrative",
    label: "Service Narrative",
    desc: "Rich text description / treatment overview shown in Step 2 of the service form.",
  },
  {
    key: "showBenefits",
    label: "Benefits Section",
    desc: "The repeatable icon + title + description benefits block (up to 6 benefits).",
  },
  {
    key: "showHeroImage",
    label: "Hero Image Upload",
    desc: "Cloudinary hero image upload in the Media step. Disable for text-only services.",
  },
  {
    key: "showBeforeAfter",
    label: "Before / After Gallery",
    desc: "Before-and-after image pair uploads in the Media step.",
  },
  {
    key: "showSeoSection",
    label: "SEO Section",
    desc: "Entire SEO step — meta title, meta description, URL slug, and keywords.",
  },
  {
    key: "showKeywordSuggestions",
    label: "AI Keyword Suggestions",
    desc: "The Gemini-powered keyword suggestion panel inside the SEO step.",
  },
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex shrink-0 items-center rounded-full transition-colors focus:outline-none ${
        on ? "bg-[#0B2560]" : "bg-gray-200"
      }`}
      style={{ width: 44, height: 24 }}
    >
      <span
        className={`inline-block bg-white rounded-full shadow transition-transform`}
        style={{
          width: 18, height: 18,
          transform: on ? "translateX(22px)" : "translateX(3px)",
        }}
      />
    </button>
  );
}

export default function ServiceFormSettingsPage() {
  const [form, setForm] = useState<ServiceFormSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.serviceForm) {
          setForm({ ...DEFAULTS, ...d.data.serviceForm });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function set<K extends keyof ServiceFormSettings>(key: K, val: ServiceFormSettings[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    setSaving(true); setError(""); setSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceForm: form }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || "Save failed"); return; }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f6faff]">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6faff]">
      <div className="max-w-2xl mx-auto px-6 py-10">

        <Link href="/admin/settings" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0B2560] transition mb-6">
          <ArrowLeft size={14} /> Settings
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2560]">Service Form</h1>
            <p className="text-gray-400 text-sm mt-0.5">Control which fields appear when creating or editing a service.</p>
          </div>
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition disabled:opacity-50 shadow-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-6">
            <CheckCircle size={14} /> Settings saved
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Field visibility */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-[#0B2560] text-sm">Field Visibility</h2>
            <p className="text-gray-400 text-xs mt-0.5">Toggle to show or hide optional sections in the service creation form.</p>
          </div>
          <div className="divide-y divide-gray-50">
            {TOGGLES.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between px-6 py-4 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                </div>
                <Toggle on={form[key] as boolean} onChange={() => set(key, !form[key] as any)} />
              </div>
            ))}
          </div>
        </div>

        {/* Default values */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-[#0B2560] text-sm">Default Values</h2>
            <p className="text-gray-400 text-xs mt-0.5">Pre-filled values when opening a new service form.</p>
          </div>
          <div className="px-6 py-5 space-y-5">

            {/* Default status */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Default Service Status</label>
              <div className="flex gap-3">
                {(["active", "draft"] as const).map((s) => (
                  <button
                    key={s} type="button"
                    onClick={() => set("defaultStatus", s)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${
                      form.defaultStatus === s
                        ? s === "active"
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-gray-600 text-white border-gray-600"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {s === "active" ? "Active (public)" : "Draft (hidden)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Default duration */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Default Duration (minutes)</label>
              <div className="flex items-center gap-3">
                {[30, 45, 60, 90].map((d) => (
                  <button key={d} type="button"
                    onClick={() => set("defaultDuration", d)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                      form.defaultDuration === d
                        ? "bg-[#0B2560] text-white border-[#0B2560]"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}>{d} min</button>
                ))}
                <input
                  type="number" min={5} max={480}
                  value={form.defaultDuration}
                  onChange={(e) => set("defaultDuration", +e.target.value)}
                  className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-[#0B2560]"
                />
              </div>
            </div>

            {/* Default currency */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Default Currency</label>
              <div className="flex gap-2">
                {["INR", "USD", "EUR"].map((c) => (
                  <button key={c} type="button"
                    onClick={() => set("defaultCurrency", c)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                      form.defaultCurrency === c
                        ? "bg-[#0B2560] text-white border-[#0B2560]"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}>{c}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
