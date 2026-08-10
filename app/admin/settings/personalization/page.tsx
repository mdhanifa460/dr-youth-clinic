"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Save, Plus, Trash2, ChevronUp, ChevronDown, Star, BarChart3, Users, Activity } from "lucide-react";

type Category = { key: string; label: string; order: number; active: boolean };
type EventWeightRow = { eventType: string; label: string; weight: number };
type ConfidenceBand = { min: number; max: number; label: string; stars: number };
type SectionRule = {
  sectionKey: string;
  label: string;
  personalizationEnabled: boolean;
  maxCategories: number;
  priority: number;
  fallbackToDefault: boolean;
  anonymousVisitorBehavior: "default" | "popular";
  returningVisitorBehavior: "personalized" | "default";
};
type PersonalizationConfig = {
  categories: Category[];
  eventWeights: EventWeightRow[];
  decayHalfLifeDays: number;
  primaryThreshold: number;
  secondaryThreshold: number;
  maxCategories: number;
  scoreSaturationPoint: number;
  confidenceBands: ConfidenceBand[];
  sections: SectionRule[];
};

const TABS = [
  { key: "analytics", label: "Interest Analytics" },
  { key: "categories", label: "Categories" },
  { key: "weights", label: "Weights & Thresholds" },
  { key: "sections", label: "Sections" },
] as const;
type TabKey = typeof TABS[number]["key"];

interface AnalyticsData {
  totalEvents: number;
  totalVisitorsTracked: number;
  categories: { key: string; label: string; count: number; visitorCount: number }[];
  eventTypes: { eventType: string; count: number }[];
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-10 h-5.5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/30 disabled:opacity-50 ${
        checked ? "bg-[#0B2560]" : "bg-gray-200"
      }`}
      style={{ width: 40, height: 22 }}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[18px]" : "translate-x-0"
        }`}
        style={{ width: 18, height: 18 }}
      />
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[#0B2560]">{label}</span>
      {hint && <span className="block text-[11px] text-gray-400 mt-0.5 mb-1.5">{hint}</span>}
      {!hint && <span className="block mb-1.5" />}
      {children}
    </label>
  );
}

const inputCls = "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 focus:border-[#0B2560]";
const numInputCls = inputCls + " tabular-nums";

export default function PersonalizationSettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const [toggleSaving, setToggleSaving] = useState(false);

  const [config, setConfig] = useState<PersonalizationConfig | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("analytics");
  const [loading, setLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const loadAnalytics = useCallback(() => {
    setAnalyticsLoading(true);
    fetch("/api/admin/personalization-analytics")
      .then((r) => r.json())
      .then((d) => { if (d.success) setAnalytics(d.data); setAnalyticsLoading(false); })
      .catch(() => setAnalyticsLoading(false));
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings").then((r) => r.json()),
      fetch("/api/admin/personalization-config").then((r) => r.json()),
    ])
      .then(([settingsRes, configRes]) => {
        if (settingsRes.success) setEnabled(!!settingsRes.data?.personalizationEnabled);
        if (configRes.success) setConfig(configRes.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    loadAnalytics();
  }, [loadAnalytics]);

  async function saveToggle(next: boolean) {
    setEnabled(next);
    setToggleSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalizationEnabled: next }),
      });
      const data = await res.json();
      if (!data.success) setEnabled(!next);
    } catch {
      setEnabled(!next);
    } finally {
      setToggleSaving(false);
    }
  }

  async function saveConfig() {
    if (!config) return;
    if (config.primaryThreshold < config.secondaryThreshold) {
      setError("Primary threshold must be ≥ secondary threshold.");
      return;
    }
    setConfigSaving(true); setError(""); setSuccess(false);
    try {
      const payload = { ...config, categories: config.categories.map((c, i) => ({ ...c, order: i })) };
      const res = await fetch("/api/admin/personalization-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || "Save failed"); return; }
      setConfig(data.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Network error — please try again");
    } finally {
      setConfigSaving(false);
    }
  }

  function updateCategory(i: number, patch: Partial<Category>) {
    setConfig((c) => c && { ...c, categories: c.categories.map((cat, idx) => (idx === i ? { ...cat, ...patch } : cat)) });
  }
  function moveCategory(i: number, dir: -1 | 1) {
    setConfig((c) => {
      if (!c) return c;
      const arr = [...c.categories];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return c;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...c, categories: arr };
    });
  }
  function addCategory() {
    setConfig((c) => c && { ...c, categories: [...c.categories, { key: "", label: "", order: c.categories.length, active: true }] });
  }
  function removeCategory(i: number) {
    setConfig((c) => c && { ...c, categories: c.categories.filter((_, idx) => idx !== i) });
  }

  function updateWeight(i: number, weight: number) {
    setConfig((c) => c && { ...c, eventWeights: c.eventWeights.map((w, idx) => (idx === i ? { ...w, weight } : w)) });
  }

  function updateBand(i: number, patch: Partial<ConfidenceBand>) {
    setConfig((c) => c && { ...c, confidenceBands: c.confidenceBands.map((b, idx) => (idx === i ? { ...b, ...patch } : b)) });
  }
  function addBand() {
    setConfig((c) => c && { ...c, confidenceBands: [...c.confidenceBands, { min: 0, max: 39, label: "New Band", stars: 1 }] });
  }
  function removeBand(i: number) {
    setConfig((c) => c && { ...c, confidenceBands: c.confidenceBands.filter((_, idx) => idx !== i) });
  }

  function updateSection(i: number, patch: Partial<SectionRule>) {
    setConfig((c) => c && { ...c, sections: c.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });
  }

  if (loading || !config) return (
    <div className="flex items-center justify-center min-h-screen bg-[#f6faff]">
      <Loader2 size={24} className="animate-spin text-gray-300" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6faff]">
      <div className="max-w-4xl mx-auto px-6 py-10">

        <Link href="/admin/settings" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0B2560] transition mb-6">
          <ArrowLeft size={14} /> Settings
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2560]">Homepage Personalization</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Interest tracking, scoring, thresholds, and per-section rules — no code changes needed.
            </p>
          </div>
          <button onClick={saveConfig} disabled={configSaving}
            className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition disabled:opacity-50 shadow-sm shrink-0">
            {configSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Config
          </button>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-6">
            <CheckCircle size={14} /> Saved. Scores will reflect these settings on next computation.
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Phase 1 master toggle */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 flex items-start gap-4">
            <Toggle checked={enabled} onChange={saveToggle} disabled={toggleSaving} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#0B2560]">Visitor Interest Tracking is {enabled ? "ON" : "OFF"}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {enabled
                  ? "Interest events are being recorded (anonymous, cookie-based — no name/phone/email ever stored against it)."
                  : "No interest events are recorded. Every tracking call is a silent no-op. Turn this on before the config below has any real data to work with."}
              </p>
            </div>
            {toggleSaving && <Loader2 size={14} className="animate-spin text-gray-300 shrink-0" />}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border border-gray-100 rounded-xl p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === t.key ? "bg-[#0B2560] text-white" : "text-gray-400 hover:text-[#0B2560]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Interest Analytics tab ──────────────────────────────── */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {analyticsLoading ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-gray-300" />
              </div>
            ) : !analytics || analytics.totalEvents === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <Activity size={24} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-semibold text-gray-600">No interest events recorded yet</p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  {enabled
                    ? "Tracking is on, but nothing has been captured yet — this fills in as real visitors browse the site."
                    : "Tracking is currently off (see the toggle above) — nothing is being recorded until it's turned on."}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                      <Activity size={18} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#0B2560] tabular-nums">{analytics.totalEvents.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">Total interest events</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <Users size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#0B2560] tabular-nums">{analytics.totalVisitorsTracked.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">Unique visitors tracked</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50">
                    <h2 className="font-bold text-[#0B2560] text-sm flex items-center gap-2"><BarChart3 size={15} /> By Category</h2>
                    <p className="text-gray-400 text-xs mt-0.5">How much signal each category has collected — this is the raw event count, not a per-visitor score (see Categories tab for the category list itself).</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {analytics.categories.length === 0 ? (
                      <p className="text-sm text-gray-400 px-6 py-8 text-center">No category data yet.</p>
                    ) : (
                      (() => {
                        const max = Math.max(...analytics.categories.map((c) => c.count), 1);
                        return analytics.categories.map((c) => (
                          <div key={c.key} className="px-6 py-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-700">{c.label}</span>
                              <span className="text-xs text-gray-400 tabular-nums">
                                {c.count.toLocaleString()} event{c.count !== 1 ? "s" : ""} · {c.visitorCount.toLocaleString()} visitor{c.visitorCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#0B2560] rounded-full" style={{ width: `${(c.count / max) * 100}%` }} />
                            </div>
                          </div>
                        ));
                      })()
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50">
                    <h2 className="font-bold text-[#0B2560] text-sm">By Event Type</h2>
                    <p className="text-gray-400 text-xs mt-0.5">Which behaviors are actually being tracked, across all categories.</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {analytics.eventTypes.map((e) => (
                      <div key={e.eventType} className="px-6 py-3 flex items-center justify-between">
                        <span className="text-sm text-gray-600 font-mono">{e.eventType}</span>
                        <span className="text-sm font-semibold text-[#0B2560] tabular-nums">{e.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            <button onClick={loadAnalytics} disabled={analyticsLoading}
              className="text-xs text-gray-400 hover:text-[#0B2560] font-semibold transition">
              Refresh
            </button>
          </div>
        )}

        {/* ── Categories tab ───────────────────────────────────────── */}
        {activeTab === "categories" && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-[#0B2560] text-sm">Interest Categories</h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  This engine's own category list — deliberately separate from Service/Assessment/Blog categories elsewhere in the CMS, so renaming here never breaks those.
                </p>
              </div>
              <button onClick={addCategory} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B2560] hover:text-blue-700 transition shrink-0">
                <Plus size={13} /> Add category
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {config.categories.map((cat, i) => (
                <div key={i} className="px-6 py-3 flex items-center gap-3">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => moveCategory(i, -1)} disabled={i === 0} className="text-gray-300 hover:text-[#0B2560] disabled:opacity-30 transition">
                      <ChevronUp size={13} />
                    </button>
                    <button onClick={() => moveCategory(i, 1)} disabled={i === config.categories.length - 1} className="text-gray-300 hover:text-[#0B2560] disabled:opacity-30 transition">
                      <ChevronDown size={13} />
                    </button>
                  </div>
                  <input
                    value={cat.label}
                    onChange={(e) => updateCategory(i, { label: e.target.value })}
                    placeholder="Label (e.g. Hair)"
                    className={inputCls + " flex-1"}
                  />
                  <input
                    value={cat.key}
                    onChange={(e) => updateCategory(i, { key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                    placeholder="key (e.g. hair)"
                    className={inputCls + " flex-1 font-mono text-xs"}
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <Toggle checked={cat.active} onChange={(v) => updateCategory(i, { active: v })} />
                    <span className="text-[11px] text-gray-400 w-10">{cat.active ? "Active" : "Off"}</span>
                  </div>
                  <button onClick={() => removeCategory(i)} className="text-gray-300 hover:text-red-500 transition shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {config.categories.length === 0 && (
                <div className="px-6 py-8 text-center text-sm text-gray-400">No categories yet — add one above.</div>
              )}
            </div>
          </div>
        )}

        {/* ── Weights & Thresholds tab ─────────────────────────────── */}
        {activeTab === "weights" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50">
                <h2 className="font-bold text-[#0B2560] text-sm">Event Weights</h2>
                <p className="text-gray-400 text-xs mt-0.5">How much each tracked behavior contributes to a category's interest score. These 6 events are wired into the codebase — the set can't be extended here, only re-weighted.</p>
              </div>
              <div className="divide-y divide-gray-50">
                {config.eventWeights.map((w, i) => (
                  <div key={w.eventType} className="px-6 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0B2560]">{w.label}</p>
                      <p className="text-[11px] text-gray-400 font-mono">{w.eventType}</p>
                    </div>
                    <input
                      type="number"
                      value={w.weight}
                      onChange={(e) => updateWeight(i, Number(e.target.value))}
                      className={numInputCls + " w-24 shrink-0"}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-[#0B2560] text-sm mb-1">Scoring</h2>
              <p className="text-gray-400 text-xs mb-4">Controls how raw event weights become the 0–100% Interest Score shown per category.</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Decay half-life (days)" hint="An event this many days old counts for half its original weight.">
                  <input type="number" value={config.decayHalfLifeDays} onChange={(e) => setConfig((c) => c && { ...c, decayHalfLifeDays: Number(e.target.value) })} className={numInputCls} />
                </Field>
                <Field label="Score saturation point" hint="Raw weighted score that maps to ~63% interest (higher = harder to reach 100%).">
                  <input type="number" value={config.scoreSaturationPoint} onChange={(e) => setConfig((c) => c && { ...c, scoreSaturationPoint: Number(e.target.value) })} className={numInputCls} />
                </Field>
                <Field label="Primary threshold (%)" hint="A category above this becomes the visitor's primary personalization target.">
                  <input type="number" min={0} max={100} value={config.primaryThreshold} onChange={(e) => setConfig((c) => c && { ...c, primaryThreshold: Number(e.target.value) })} className={numInputCls} />
                </Field>
                <Field label="Secondary threshold (%)" hint="A category above this qualifies to be blended in, even if not primary.">
                  <input type="number" min={0} max={100} value={config.secondaryThreshold} onChange={(e) => setConfig((c) => c && { ...c, secondaryThreshold: Number(e.target.value) })} className={numInputCls} />
                </Field>
                <Field label="Maximum categories" hint="Cap on how many qualifying categories can be blended onto the homepage at once.">
                  <input type="number" min={1} value={config.maxCategories} onChange={(e) => setConfig((c) => c && { ...c, maxCategories: Number(e.target.value) })} className={numInputCls} />
                </Field>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-[#0B2560] text-sm">Confidence Bands</h2>
                  <p className="text-gray-400 text-xs mt-0.5">Star rating shown alongside each category's percentage.</p>
                </div>
                <button onClick={addBand} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B2560] hover:text-blue-700 transition shrink-0">
                  <Plus size={13} /> Add band
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {config.confidenceBands.map((b, i) => (
                  <div key={i} className="px-6 py-3 flex items-center gap-3">
                    <input type="number" value={b.min} onChange={(e) => updateBand(i, { min: Number(e.target.value) })} className={numInputCls + " w-20"} placeholder="Min" />
                    <span className="text-gray-300 text-xs shrink-0">–</span>
                    <input type="number" value={b.max} onChange={(e) => updateBand(i, { max: Number(e.target.value) })} className={numInputCls + " w-20"} placeholder="Max" />
                    <input value={b.label} onChange={(e) => updateBand(i, { label: e.target.value })} className={inputCls + " flex-1"} placeholder="Label" />
                    <input type="number" min={1} max={5} value={b.stars} onChange={(e) => updateBand(i, { stars: Number(e.target.value) })} className={numInputCls + " w-16"} />
                    <Star size={13} className="text-amber-400 fill-amber-400 shrink-0" />
                    <button onClick={() => removeBand(i)} className="text-gray-300 hover:text-red-500 transition shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Sections tab ─────────────────────────────────────────── */}
        {activeTab === "sections" && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h2 className="font-bold text-[#0B2560] text-sm">Per-Section Personalization Rules</h2>
              <p className="text-gray-400 text-xs mt-0.5">
                One row per real homepage section. Disabled sections always show default content regardless of visitor scores. This list mirrors the homepage's actual section set — sections can't be added here, only configured.
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {config.sections.map((s, i) => (
                <div key={s.sectionKey} className="px-6 py-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Toggle checked={s.personalizationEnabled} onChange={(v) => updateSection(i, { personalizationEnabled: v })} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0B2560]">{s.label}</p>
                      <p className="text-[11px] text-gray-400 font-mono">{s.sectionKey}</p>
                    </div>
                  </div>
                  {s.personalizationEnabled && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pl-[52px]">
                      <Field label="Max categories">
                        <input type="number" min={1} value={s.maxCategories} onChange={(e) => updateSection(i, { maxCategories: Number(e.target.value) })} className={numInputCls} />
                      </Field>
                      <Field label="Priority">
                        <input type="number" value={s.priority} onChange={(e) => updateSection(i, { priority: Number(e.target.value) })} className={numInputCls} />
                      </Field>
                      <Field label="Anonymous visitor">
                        <select value={s.anonymousVisitorBehavior} onChange={(e) => updateSection(i, { anonymousVisitorBehavior: e.target.value as SectionRule["anonymousVisitorBehavior"] })} className={inputCls}>
                          <option value="default">Show default</option>
                          <option value="popular">Show most popular</option>
                        </select>
                      </Field>
                      <Field label="Returning visitor">
                        <select value={s.returningVisitorBehavior} onChange={(e) => updateSection(i, { returningVisitorBehavior: e.target.value as SectionRule["returningVisitorBehavior"] })} className={inputCls}>
                          <option value="personalized">Personalize</option>
                          <option value="default">Show default</option>
                        </select>
                      </Field>
                      <label className="flex items-center gap-2 col-span-2 sm:col-span-4">
                        <input type="checkbox" checked={s.fallbackToDefault} onChange={(e) => updateSection(i, { fallbackToDefault: e.target.checked })} className="rounded border-gray-300" />
                        <span className="text-xs text-gray-500">Fall back to default content if no category qualifies</span>
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
