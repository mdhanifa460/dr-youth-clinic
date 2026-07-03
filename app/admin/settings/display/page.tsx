"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Save } from "lucide-react";

type DisplaySettings = {
  showPriceOnCards: boolean;
  showDurationOnCards: boolean;
  showBeforeAfterOnPublic: boolean;
  relatedServicesCount: number;
};

const DEFAULTS: DisplaySettings = {
  showPriceOnCards: true,
  showDurationOnCards: true,
  showBeforeAfterOnPublic: true,
  relatedServicesCount: 3,
};

const TOGGLES: { key: keyof DisplaySettings; label: string; desc: string }[] = [
  {
    key: "showPriceOnCards",
    label: "Price on Service Cards",
    desc: "Show the price badge on category and service listing cards on the public website.",
  },
  {
    key: "showDurationOnCards",
    label: "Duration on Service Cards",
    desc: "Show the session duration badge (e.g. 60 min) on service cards.",
  },
  {
    key: "showBeforeAfterOnPublic",
    label: "Before / After Gallery",
    desc: "Display the before-and-after image gallery on individual service detail pages.",
  },
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex shrink-0 items-center rounded-full transition-colors ${on ? "bg-[#0B2560]" : "bg-gray-200"}`}
      style={{ width: 44, height: 24 }}
    >
      <span
        className="inline-block bg-white rounded-full shadow transition-transform"
        style={{ width: 18, height: 18, transform: on ? "translateX(22px)" : "translateX(3px)" }}
      />
    </button>
  );
}

export default function DisplaySettingsPage() {
  const [form, setForm] = useState<DisplaySettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.display) setForm({ ...DEFAULTS, ...d.data.display });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function set<K extends keyof DisplaySettings>(key: K, val: DisplaySettings[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    setSaving(true); setError(""); setSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display: form }),
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#f6faff]">
      <Loader2 size={24} className="animate-spin text-gray-300" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6faff]">
      <div className="max-w-2xl mx-auto px-6 py-10">

        <Link href="/admin/settings" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0B2560] transition mb-6">
          <ArrowLeft size={14} /> Settings
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2560]">Public Display</h1>
            <p className="text-gray-400 text-sm mt-0.5">Control what visitors see on service cards and detail pages.</p>
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

        {/* Visibility toggles */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-[#0B2560] text-sm">Visibility</h2>
            <p className="text-gray-400 text-xs mt-0.5">Show or hide elements across the public services section.</p>
          </div>
          <div className="divide-y divide-gray-50">
            {TOGGLES.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between px-6 py-4 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
                <Toggle on={form[key] as boolean} onChange={() => set(key, !form[key] as any)} />
              </div>
            ))}
          </div>
        </div>

        {/* Related services count */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-[#0B2560] text-sm">Related Services</h2>
            <p className="text-gray-400 text-xs mt-0.5">How many related services to show at the bottom of each service detail page.</p>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-center gap-2">
              {[2, 3, 4, 6].map((n) => (
                <button key={n} type="button"
                  onClick={() => set("relatedServicesCount", n)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                    form.relatedServicesCount === n
                      ? "bg-[#0B2560] text-white border-[#0B2560]"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}>{n}</button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Current: {form.relatedServicesCount} related services shown per page</p>
          </div>
        </div>

      </div>
    </div>
  );
}
