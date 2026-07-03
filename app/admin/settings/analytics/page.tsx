"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Save } from "lucide-react";

type AnalyticsSettings = {
  ga4Id: string;
  metaPixelId: string;
  gtmId: string;
  clarityId: string;
  hotjarId: string;
};

const DEFAULTS: AnalyticsSettings = {
  ga4Id: "",
  metaPixelId: "",
  gtmId: "",
  clarityId: "",
  hotjarId: "",
};

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
      Not configured
    </span>
  );
}

export default function AnalyticsSettingsPage() {
  const [form, setForm] = useState<AnalyticsSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.analytics) setForm({ ...DEFAULTS, ...d.data.analytics });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function set<K extends keyof AnalyticsSettings>(key: K, val: AnalyticsSettings[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    setSaving(true); setError(""); setSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analytics: form }),
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

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2560]">Analytics & Tracking</h1>
            <p className="text-gray-400 text-sm mt-0.5">Connect measurement tools to track visitors and conversions.</p>
          </div>
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition disabled:opacity-50 shadow-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-[#0B2560] text-white px-5 py-4 rounded-2xl mb-6">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="shrink-0 mt-0.5 opacity-80">
            <circle cx="7.5" cy="7.5" r="7" stroke="white" strokeWidth="1.2" />
            <rect x="7" y="6" width="1" height="5" rx="0.5" fill="white" />
            <rect x="7" y="4" width="1" height="1.2" rx="0.5" fill="white" />
          </svg>
          <p className="text-sm leading-relaxed opacity-90">
            These IDs are injected into every public page as tracking scripts. No API secrets here — only public measurement IDs that belong in the browser.
          </p>
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

        {/* Google Analytics 4 */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#0B2560] text-sm">Google Analytics 4</h2>
              <p className="text-gray-400 text-xs mt-0.5">Track page views, sessions, and user behaviour.</p>
            </div>
            <StatusBadge active={!!form.ga4Id} />
          </div>
          <div className="px-6 py-5 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Measurement ID
              </label>
              <input
                type="text"
                value={form.ga4Id}
                onChange={(e) => set("ga4Id", e.target.value)}
                placeholder="G-XXXXXXXXXX"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] font-mono"
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Find this in Google Analytics → Admin → Data Streams → Measurement ID
            </p>
          </div>
        </div>

        {/* Meta (Facebook) Pixel */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#0B2560] text-sm">Meta (Facebook) Pixel</h2>
              <p className="text-gray-400 text-xs mt-0.5">Track conversions and retarget visitors via Meta Ads.</p>
            </div>
            <StatusBadge active={!!form.metaPixelId} />
          </div>
          <div className="px-6 py-5 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Pixel ID
              </label>
              <input
                type="text"
                value={form.metaPixelId}
                onChange={(e) => set("metaPixelId", e.target.value)}
                placeholder="1234567890123"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] font-mono"
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Find this in Meta Business Suite → Events Manager → Data Sources
            </p>
          </div>
        </div>

        {/* Google Tag Manager */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#0B2560] text-sm">Google Tag Manager</h2>
              <p className="text-gray-400 text-xs mt-0.5">Manage all tags and pixels from one dashboard without code changes.</p>
            </div>
            <StatusBadge active={!!form.gtmId} />
          </div>
          <div className="px-6 py-5 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Container ID
              </label>
              <input
                type="text"
                value={form.gtmId}
                onChange={(e) => set("gtmId", e.target.value)}
                placeholder="GTM-XXXXXXX"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] font-mono"
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Use GTM to manage all tracking in one place without code changes
            </p>
          </div>
        </div>

        {/* Microsoft Clarity */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#0B2560] text-sm">Microsoft Clarity</h2>
              <p className="text-gray-400 text-xs mt-0.5">Free session recordings and click heatmaps.</p>
            </div>
            <StatusBadge active={!!form.clarityId} />
          </div>
          <div className="px-6 py-5 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Project ID
              </label>
              <input
                type="text"
                value={form.clarityId}
                onChange={(e) => set("clarityId", e.target.value)}
                placeholder="abc123def"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] font-mono"
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Free session recordings and heatmaps. Get it at clarity.microsoft.com
            </p>
          </div>
        </div>

        {/* Hotjar */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#0B2560] text-sm">Hotjar</h2>
              <p className="text-gray-400 text-xs mt-0.5">Heatmaps, session recordings, and feedback polls.</p>
            </div>
            <StatusBadge active={!!form.hotjarId} />
          </div>

          {/* Overlap warning banner */}
          <div className="mx-6 mt-4 flex items-start gap-2.5 bg-amber-50 border border-amber-100 px-4 py-3 rounded-xl">
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none" className="shrink-0 mt-0.5 text-amber-500">
              <path d="M7.5 1L14 13H1L7.5 1Z" stroke="#d97706" strokeWidth="1.2" strokeLinejoin="round" />
              <rect x="7" y="6" width="1" height="4" rx="0.5" fill="#d97706" />
              <rect x="7" y="11" width="1" height="1.2" rx="0.5" fill="#d97706" />
            </svg>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Clarity and Hotjar both provide heatmaps — we recommend using only one to avoid duplicate data.
            </p>
          </div>

          <div className="px-6 py-5 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Site ID
              </label>
              <input
                type="text"
                value={form.hotjarId}
                onChange={(e) => set("hotjarId", e.target.value)}
                placeholder="1234567"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] font-mono"
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Optional — overlaps with Clarity. Use one or the other.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
