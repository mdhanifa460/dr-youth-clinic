"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Save, ChevronDown } from "lucide-react";
import { validateTrackingIds, type TrackingIdField } from "@/app/lib/analytics/validateTrackingIds";

type AnalyticsSettings = {
  gtmEnabled: boolean;
  gtmId: string;
  gtmAuth: string;
  gtmPreview: string;
  ga4Id: string;
  metaPixelId: string;
  clarityId: string;
  hotjarId: string;
  searchConsoleId: string;
};

const DEFAULTS: AnalyticsSettings = {
  gtmEnabled: true,
  gtmId: "",
  gtmAuth: "",
  gtmPreview: "",
  ga4Id: "",
  metaPixelId: "",
  clarityId: "",
  hotjarId: "",
  searchConsoleId: "",
};

type DomainMigrationSettings = {
  enabled: boolean;
  oldDomain: string;
  ga4PropertyId: string;
  oldDomainGscSiteUrl: string;
  newDomainGscSiteUrl: string;
  healthyThresholdPct: number;
  monitorThresholdPct: number;
  organicFloorThresholdPct: number;
};

const DM_DEFAULTS: DomainMigrationSettings = {
  enabled: true,
  oldDomain: "",
  ga4PropertyId: "",
  oldDomainGscSiteUrl: "",
  newDomainGscSiteUrl: "",
  healthyThresholdPct: 5,
  monitorThresholdPct: 15,
  organicFloorThresholdPct: 20,
};

// Three real states now, not just on/off — matters most for GA4/Meta
// Pixel, which can be "the browser is loading this directly" or "GTM is
// (expected to be) loading this instead" or plain "nothing configured".
function StatusBadge({ status }: { status: "gtm" | "direct" | "off" }) {
  if (status === "gtm") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
        Managed by GTM
      </span>
    );
  }
  if (status === "direct") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        Direct — Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
      Disabled
    </span>
  );
}

// Persistent (never auto-dismisses like the page-level save toast) —
// tells you what's ACTUALLY in the database for this exact field, not
// just what's sitting in the input. `savedValue === null` means the
// initial GET hasn't resolved yet, so this deliberately renders nothing
// rather than a misleading default.
function SavedStatus({ currentValue, savedValue }: { currentValue: string; savedValue: string | null }) {
  if (savedValue === null) return null;
  if (currentValue === savedValue) {
    return currentValue ? (
      <p className="text-[11px] text-emerald-600 mt-1.5 flex items-center gap-1">
        <CheckCircle size={11} className="shrink-0" /> Saved to database
      </p>
    ) : null;
  }
  return (
    <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
      <AlertCircle size={11} className="shrink-0" />
      Not saved yet — database currently has {savedValue ? <code className="font-mono">{savedValue}</code> : "nothing"}. Click Save to apply this change.
    </p>
  );
}

function InlineFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-[11px] text-red-600 mt-1.5 flex items-center gap-1">
      <AlertCircle size={11} className="shrink-0" /> {message}
    </p>
  );
}

// "Configured" (saved to the DB) vs "Detected on this page load" (GTM's own
// window.google_tag_manager global actually present right now) are two
// different claims — this never asserts detection proves GA4 itself fired,
// only that GTM's container executed on this page.
function DetectionRow({ gtmDetected, dataLayerDetected }: { gtmDetected: boolean; dataLayerDetected: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-gray-400 mt-2">
      <span className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full inline-block ${gtmDetected ? "bg-emerald-500" : "bg-gray-300"}`} />
        GTM container {gtmDetected ? "detected on this page load" : "not detected on this page load"}
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full inline-block ${dataLayerDetected ? "bg-emerald-500" : "bg-gray-300"}`} />
        dataLayer {dataLayerDetected ? "receiving pushes" : "empty"}
      </span>
    </div>
  );
}

export default function AnalyticsSettingsPage() {
  const [form, setForm] = useState<AnalyticsSettings>(DEFAULTS);
  // What the database actually has right now — set once on load, and
  // again only after a save genuinely succeeds. `form` above is just the
  // editable draft; comparing the two is what lets a field honestly say
  // "saved" vs "not saved yet" instead of a 3-second toast that's easy to
  // miss and tells you nothing once it's gone. Real incident this fixes:
  // an admin saw GTM-NX462ZPQ/G-0K4NNXXBND sitting in these inputs and
  // reasonably assumed they were live — the database still had "" for
  // both. A toast that already vanished couldn't have told them that;
  // this can, indefinitely, without needing to click Save again to find out.
  const [savedForm, setSavedForm] = useState<AnalyticsSettings | null>(null);
  const [dmForm, setDmForm] = useState<DomainMigrationSettings>(DM_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [gtmAdvancedOpen, setGtmAdvancedOpen] = useState(false);
  // GTM's own globals — present once its script has actually executed on
  // THIS page load, not just whatever's saved in the DB. Read once on
  // mount so the page can show "Configured" (from the saved value below)
  // separately from "Detected on this page load" (this admin page loads
  // GTM/GA4 the exact same way the public site does, via app/layout.tsx —
  // no separate script injection here).
  const [gtmDetected, setGtmDetected] = useState(false);
  const [dataLayerDetected, setDataLayerDetected] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.analytics) {
          setForm({ ...DEFAULTS, ...d.data.analytics });
          setSavedForm({ ...DEFAULTS, ...d.data.analytics });
        }
        if (d.success && d.data?.domainMigration) setDmForm({ ...DM_DEFAULTS, ...d.data.domainMigration });
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const w = window as any;
    setGtmDetected(typeof w.google_tag_manager !== "undefined");
    setDataLayerDetected(Array.isArray(w.dataLayer) && w.dataLayer.length > 0);
  }, []);

  function set<K extends keyof AnalyticsSettings>(key: K, val: AnalyticsSettings[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }
  function setDm<K extends keyof DomainMigrationSettings>(key: K, val: DomainMigrationSettings[K]) {
    setDmForm((f) => ({ ...f, [key]: val }));
  }

  // Same validators the server enforces (app/api/admin/settings/route.ts)
  // — computed live so an admin sees a problem before clicking Save, not
  // just after a rejected PUT. Empty is always valid (means "not set").
  const fieldErrors = useMemo(() => {
    const { errors } = validateTrackingIds({
      gtmId: form.gtmId,
      ga4Id: form.ga4Id,
      metaPixelId: form.metaPixelId,
      clarityId: form.clarityId,
      hotjarId: form.hotjarId,
    });
    return errors;
  }, [form.gtmId, form.ga4Id, form.metaPixelId, form.clarityId, form.hotjarId]);

  async function save() {
    const firstError = (Object.values(fieldErrors) as (string | undefined)[]).find(Boolean);
    if (firstError) { setError(firstError); setSuccess(false); return; }

    setSaving(true); setError(""); setSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analytics: form, domainMigration: dmForm }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || "Save failed"); return; }
      // Only advance the "actually saved" snapshot on a genuine 2xx +
      // success — never optimistically, so this can never claim something
      // is saved when the request actually failed.
      setSavedForm(form);
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

  const gtmActive = form.gtmEnabled && !!form.gtmId;
  const ga4Status: "gtm" | "direct" | "off" = gtmActive ? "gtm" : form.ga4Id ? "direct" : "off";
  const metaStatus: "gtm" | "direct" | "off" = gtmActive ? "gtm" : form.metaPixelId ? "direct" : "off";

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
            Google Tag Manager is the recommended way to run this site's tracking — turn it on below and manage every
            pixel/tag (however many GA4 properties or Meta Pixels your marketing team uses) from inside GTM itself,
            with zero code changes here ever again. GA4 and Meta Pixel below are the older, direct-integration path —
            keep using them only if you're not on GTM yet. No API secrets on this page either way — only public
            measurement IDs that belong in the browser.
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

        {/* Google Tag Manager — primary */}
        <div className="bg-white rounded-2xl border-2 border-[#0B2560]/15 overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#0B2560] text-sm flex items-center gap-2">
                Google Tag Manager
                <span className="text-[9px] font-bold bg-[#F5A623]/20 text-[#8a5c0e] px-1.5 py-0.5 rounded">RECOMMENDED</span>
              </h2>
              <p className="text-gray-400 text-xs mt-0.5">One container manages every GA4 property, Meta Pixel, Google Ads tag, and more — no code changes when marketing adds or swaps a tag.</p>
            </div>
            <StatusBadge status={gtmActive ? "gtm" : "off"} />
          </div>
          <div className="px-6 py-5 space-y-4">
            <label className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.gtmEnabled}
                onClick={() => set("gtmEnabled", !form.gtmEnabled)}
                className={`relative shrink-0 w-10 h-5.5 rounded-full transition-colors ${form.gtmEnabled ? "bg-[#0B2560]" : "bg-gray-200"}`}
                style={{ width: 40, height: 22 }}
              >
                <span
                  className="absolute top-0.5 left-0.5 bg-white rounded-full shadow-sm transition-transform duration-200"
                  style={{ width: 18, height: 18, transform: form.gtmEnabled ? "translateX(18px)" : "translateX(0)" }}
                />
              </button>
              <span className="text-sm font-semibold text-gray-700">GTM {form.gtmEnabled ? "enabled" : "disabled"}</span>
            </label>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Container ID</label>
              <input
                type="text"
                value={form.gtmId}
                onChange={(e) => set("gtmId", e.target.value)}
                placeholder="GTM-XXXXXXX"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] font-mono"
              />
              <InlineFieldError message={fieldErrors.gtmId} />
              <SavedStatus currentValue={form.gtmId} savedValue={savedForm?.gtmId ?? null} />
              <p className="text-[11px] text-gray-400 mt-1.5">
                Find this in Google Tag Manager → Admin → Container Settings. While this is on, GA4 and Meta Pixel
                below will NOT load directly — configure them as tags inside this GTM container instead, so nothing
                fires twice.
              </p>
              {gtmActive && <DetectionRow gtmDetected={gtmDetected} dataLayerDetected={dataLayerDetected} />}
            </div>

            <button
              type="button"
              onClick={() => setGtmAdvancedOpen((o) => !o)}
              className="flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-[#0B2560] transition uppercase tracking-wider"
            >
              <ChevronDown size={12} className={`transition-transform ${gtmAdvancedOpen ? "rotate-180" : ""}`} />
              Advanced — Environment / Preview
            </button>
            {gtmAdvancedOpen && (
              <div className="grid sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">gtm_auth</label>
                  <input
                    type="text"
                    value={form.gtmAuth}
                    onChange={(e) => set("gtmAuth", e.target.value)}
                    placeholder="Optional"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0B2560] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">gtm_preview</label>
                  <input
                    type="text"
                    value={form.gtmPreview}
                    onChange={(e) => set("gtmPreview", e.target.value)}
                    placeholder="Optional"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0B2560] font-mono"
                  />
                </div>
                <p className="text-[11px] text-gray-400 sm:col-span-2">
                  Only needed if you're pointing this site at a non-Live GTM environment (Admin → Environments in
                  GTM) to test a container change before publishing it. Leave both blank for normal production use.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Google Analytics 4 */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#0B2560] text-sm">Google Analytics 4</h2>
              <p className="text-gray-400 text-xs mt-0.5">
                {gtmActive ? "Advanced/fallback — add GA4 as a tag inside GTM instead; this field is ignored while GTM is on." : "Track page views, sessions, and user behaviour."}
              </p>
            </div>
            <StatusBadge status={ga4Status} />
          </div>
          <div className={`px-6 py-5 space-y-3 ${gtmActive ? "opacity-50" : ""}`}>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Measurement ID
              </label>
              <input
                type="text"
                value={form.ga4Id}
                onChange={(e) => set("ga4Id", e.target.value)}
                disabled={gtmActive}
                placeholder="G-XXXXXXXXXX"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] font-mono disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
              <InlineFieldError message={fieldErrors.ga4Id} />
              <SavedStatus currentValue={form.ga4Id} savedValue={savedForm?.ga4Id ?? null} />
            </div>
            <p className="text-[11px] text-gray-400">
              {gtmActive
                ? "Not loaded directly while GTM is enabled above — this value is kept in case you turn GTM off later, but has no effect right now."
                : "Find this in Google Analytics → Admin → Data Streams → Measurement ID"}
            </p>
          </div>
        </div>

        {/* Meta (Facebook) Pixel */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#0B2560] text-sm">Meta (Facebook) Pixel</h2>
              <p className="text-gray-400 text-xs mt-0.5">
                {gtmActive ? "Advanced/fallback — add your Pixel(s) as tags inside GTM instead; this field is ignored while GTM is on." : "Track conversions and retarget visitors via Meta Ads."}
              </p>
            </div>
            <StatusBadge status={metaStatus} />
          </div>
          <div className={`px-6 py-5 space-y-3 ${gtmActive ? "opacity-50" : ""}`}>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Pixel ID
              </label>
              <input
                type="text"
                value={form.metaPixelId}
                onChange={(e) => set("metaPixelId", e.target.value)}
                disabled={gtmActive}
                placeholder="1234567890123"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] font-mono disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
              <InlineFieldError message={fieldErrors.metaPixelId} />
            </div>
            <p className="text-[11px] text-gray-400">
              {gtmActive
                ? "Not loaded directly while GTM is enabled above — this value is kept in case you turn GTM off later, but has no effect right now."
                : "Find this in Meta Business Suite → Events Manager → Data Sources. Only one pixel here — if marketing runs several, that's exactly the case GTM above is for."}
            </p>
          </div>
        </div>

        {/* Microsoft Clarity */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#0B2560] text-sm">Microsoft Clarity</h2>
              <p className="text-gray-400 text-xs mt-0.5">Free session recordings and click heatmaps. Runs independently of GTM.</p>
            </div>
            <StatusBadge status={form.clarityId ? "direct" : "off"} />
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
              <InlineFieldError message={fieldErrors.clarityId} />
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
              <p className="text-gray-400 text-xs mt-0.5">Heatmaps, session recordings, and feedback polls. Runs independently of GTM.</p>
            </div>
            <StatusBadge status={form.hotjarId ? "direct" : "off"} />
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
              <InlineFieldError message={fieldErrors.hotjarId} />
            </div>
            <p className="text-[11px] text-gray-400">
              Optional — overlaps with Clarity. Use one or the other.
            </p>
          </div>
        </div>

        {/* Google Search Console */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#0B2560] text-sm">Google Search Console</h2>
              <p className="text-gray-400 text-xs mt-0.5">Verify site ownership to monitor SEO rankings and indexing. A verification mechanism, not a tracking tag — independent of GTM.</p>
            </div>
            <StatusBadge status={form.searchConsoleId ? "direct" : "off"} />
          </div>
          <div className="mx-6 mt-4 flex items-start gap-2.5 bg-green-50 border border-green-100 px-4 py-3 rounded-xl">
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none" className="shrink-0 mt-0.5">
              <circle cx="7.5" cy="7.5" r="6.5" stroke="#16a34a" strokeWidth="1.2"/>
              <path d="M4.5 7.5l2 2 4-4" stroke="#16a34a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-[11px] text-green-700 leading-relaxed">
              Tip: If your GA4 is already configured, Google Search Console can verify ownership automatically — no code needed. Paste the HTML tag verification code here only if using the manual method.
            </p>
          </div>
          <div className="px-6 py-5 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Verification Code <span className="font-normal text-gray-400">(HTML tag method)</span>
              </label>
              <input
                type="text"
                value={form.searchConsoleId}
                onChange={(e) => set("searchConsoleId", e.target.value)}
                placeholder="abc123XYZ_ExampleVerificationCode"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] font-mono"
              />
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              In Search Console → Settings → Ownership verification → HTML tag — copy only the <code className="bg-gray-100 px-1 rounded">content="…"</code> value, not the full tag.
            </p>
          </div>
        </div>

        {/* Domain Migration */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#0B2560] text-sm">Domain Migration</h2>
              <p className="text-gray-400 text-xs mt-0.5">Powers Marketing Intelligence → Domain Migration. Read-only, server-side — no data is written back to GA4 or Search Console.</p>
            </div>
            <StatusBadge status={dmForm.enabled ? (dmForm.ga4PropertyId && dmForm.oldDomainGscSiteUrl ? "direct" : "off") : "off"} />
          </div>
          <div className="mx-6 mt-4 flex items-start gap-2.5 bg-[#f6faff] border border-blue-50 px-4 py-3 rounded-xl">
            <p className="text-[11px] text-[#0B2560]/80 leading-relaxed">
              Needs a Google Cloud service account granted <strong>Viewer</strong> on the GA4 property and added under
              Search Console → Settings → Users and permissions for both domain properties. Paste its full downloaded
              JSON key into the <code className="bg-white px-1 rounded">GOOGLE_SERVICE_ACCOUNT_JSON</code> environment
              variable (Vercel → Settings → Environment Variables) — not entered here, since it's a secret, same as
              every other API key in this app.
            </p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <label className="flex items-center gap-3">
              <button type="button" role="switch" aria-checked={dmForm.enabled} onClick={() => setDm("enabled", !dmForm.enabled)}
                className={`relative shrink-0 rounded-full transition-colors ${dmForm.enabled ? "bg-[#0B2560]" : "bg-gray-200"}`}
                style={{ width: 40, height: 22 }}>
                <span className="absolute top-0.5 left-0.5 bg-white rounded-full shadow-sm transition-transform duration-200"
                  style={{ width: 18, height: 18, transform: dmForm.enabled ? "translateX(18px)" : "translateX(0)" }} />
              </button>
              <span className="text-sm font-semibold text-gray-700">Domain Migration panel {dmForm.enabled ? "enabled" : "disabled"}</span>
            </label>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Old domain</label>
              <input type="text" value={dmForm.oldDomain} onChange={(e) => setDm("oldDomain", e.target.value)}
                placeholder="dryouthclinic.co.in"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] font-mono" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">GA4 property ID</label>
              <input type="text" value={dmForm.ga4PropertyId} onChange={(e) => setDm("ga4PropertyId", e.target.value)}
                placeholder="123456789"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] font-mono" />
              <p className="text-[11px] text-gray-400 mt-1.5">GA4 → Admin → Property Settings — the numeric Property ID, not the "G-XXXXXXX" measurement ID above.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Old-domain GSC site URL</label>
                <input type="text" value={dmForm.oldDomainGscSiteUrl} onChange={(e) => setDm("oldDomainGscSiteUrl", e.target.value)}
                  placeholder="https://dryouthclinic.co.in/"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0B2560] font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">New-domain GSC site URL</label>
                <input type="text" value={dmForm.newDomainGscSiteUrl} onChange={(e) => setDm("newDomainGscSiteUrl", e.target.value)}
                  placeholder="https://dryouthclinics.com/"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0B2560] font-mono" />
              </div>
            </div>
            <p className="text-[11px] text-gray-400">
              Exactly as they appear in Search Console's own property list — the old domain needs its own verified property (separate from the new one) for this to show anything.
            </p>

            <div className="grid sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Healthy below (%)</label>
                <input type="number" min={0} max={100} value={dmForm.healthyThresholdPct}
                  onChange={(e) => setDm("healthyThresholdPct", Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0B2560] font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Significant above (%)</label>
                <input type="number" min={0} max={100} value={dmForm.monitorThresholdPct}
                  onChange={(e) => setDm("monitorThresholdPct", Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0B2560] font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Organic floor (%)</label>
                <input type="number" min={0} max={100} value={dmForm.organicFloorThresholdPct}
                  onChange={(e) => setDm("organicFloorThresholdPct", Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0B2560] font-mono" />
              </div>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Old-domain share of traffic/leads under "Healthy below" shows 🟢; above "Significant above" (or old-domain organic impressions above "Organic floor") shows 🔴; the range between is 🟡. Any single high-traffic URL that redirects incorrectly always shows 🔴, regardless of these numbers.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
