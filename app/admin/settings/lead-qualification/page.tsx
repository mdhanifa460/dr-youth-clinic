'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Loader2, Flame, SlidersHorizontal, Info } from 'lucide-react';
import { DEFAULT_LEAD_QUALIFICATION } from '@/app/lib/leadQualification/defaults';

// Mirrors the fixed event catalog in
// app/lib/leadQualification/computeQualification.ts — a scoring rule's
// `event` must be one of these, or it silently never matches (by design,
// see that file's default case). Adding a new scoreable signal means
// adding it there first, then here.
const EVENTS = [
  { key: 'phone_present', label: 'Phone number present' },
  { key: 'service_selected', label: 'Service/treatment selected' },
  { key: 'location_selected', label: 'Branch selected' },
  { key: 'assessment_completed', label: 'Assessment completed' },
  { key: 'high_assessment_risk', label: 'High assessment concern' },
  { key: 'status_contacted', label: 'Status: team made contact' },
  { key: 'status_confirmed', label: 'Status: appointment confirmed' },
  { key: 'status_arrived', label: 'Status: patient arrived' },
  { key: 'status_completed', label: 'Status: treatment completed' },
  { key: 'return_visit', label: 'Returning visitor' },
  { key: 'treatment_value_set', label: 'Treatment value estimated' },
  { key: 'utm_campaign_present', label: 'Arrived via a tracked campaign' },
  { key: 'booking_success_event', label: 'Engaged on booking confirmation page' },
];

const TEMPERATURE_KEYS = ['cold', 'warm', 'hot', 'very_hot'] as const;

function uid() { return Math.random().toString(36).slice(2, 10); }

function bumpVersion(v: string): string {
  const match = /^v(\d+)$/.exec(v || '');
  return match ? `v${Number(match[1]) + 1}` : 'v1';
}

export default function LeadQualificationSettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const [version, setVersion] = useState('v1');
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings').then((r) => r.json()).then((d) => {
      if (d.success) {
        // Falls back to the same illustrative defaults an admin would see
        // on a fresh install — never crashes on an old Settings doc that
        // predates this block (see leadQualification/defaults.ts).
        const config = d.data.leadQualification ?? DEFAULT_LEAD_QUALIFICATION;
        setEnabled(!!config.enabled);
        setVersion(config.version || 'v1');
        setThresholds(config.thresholds?.length ? config.thresholds : DEFAULT_LEAD_QUALIFICATION.thresholds);
        setRules(config.scoringRules?.length ? config.scoringRules : DEFAULT_LEAD_QUALIFICATION.scoringRules);
      }
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true); setSaved(false);
    const nextVersion = bumpVersion(version);
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadQualification: {
          enabled,
          version: nextVersion,
          thresholds,
          scoringRules: rules,
          notifyOnHot: { enabled: false, minTemperature: 'hot' },
        },
      }),
    });
    setVersion(nextVersion);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const addThreshold = () => setThresholds((t) => [...t, { id: uid(), key: 'warm', label: '', minScore: 0, maxScore: 0, order: t.length, color: '#F59E0B', active: true }]);
  const updateThreshold = (i: number, patch: any) => setThresholds((t) => t.map((row, idx) => idx === i ? { ...row, ...patch } : row));
  const removeThreshold = (i: number) => setThresholds((t) => t.filter((_, idx) => idx !== i));

  const addRule = () => setRules((r) => [...r, { id: uid(), event: 'service_selected', points: 5, enabled: true, branch: '', description: '' }]);
  const updateRule = (i: number, patch: any) => setRules((r) => r.map((row, idx) => idx === i ? { ...row, ...patch } : row));
  const removeRule = (i: number) => setRules((r) => r.filter((_, idx) => idx !== i));

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={22} className="animate-spin text-gray-300" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0B2560] flex items-center gap-2"><Flame size={18} /> Lead Qualification</h1>
          <p className="text-gray-400 text-sm mt-0.5 max-w-2xl">
            Deterministic, rule-based scoring (0–100) that classifies a lead&apos;s current intent — Cold / Warm / Hot / Very Hot — separately from
            its Status (New, Contacted, …). No AI is involved in the score itself. Changes here take effect for leads created or updated after saving;
            existing leads keep their last-computed score until they&apos;re next updated.
          </p>
        </div>
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* Enable toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">Enable Lead Qualification Engine</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Off by default. While off, every lead shows as &ldquo;Unscored&rdquo; — nothing is guessed. Version: <span className="font-mono">{version}</span>
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="sr-only peer" />
          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#0B2560] transition-colors" />
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
        </label>
      </div>

      {/* Thresholds */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#0B2560] flex items-center gap-1.5"><SlidersHorizontal size={15} /> Temperature Thresholds</h2>
          <button onClick={addThreshold} className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline">
            <Plus size={12} /> Add Threshold
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-3 flex items-start gap-1.5">
          <Info size={13} className="shrink-0 mt-0.5" />
          A score maps to the first active row whose range it falls in. A score outside every range (a gap in your ranges) shows as
          &ldquo;Unscored&rdquo; rather than guessing the nearest label.
        </p>
        <div className="space-y-2.5">
          {thresholds.map((t, i) => (
            <div key={t.id} className={`bg-white rounded-2xl border p-4 flex items-center gap-2.5 flex-wrap ${t.active ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}>
              <select value={t.key} onChange={(e) => updateThreshold(i, { key: e.target.value })}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-semibold bg-white focus:outline-none w-28">
                {TEMPERATURE_KEYS.map((k) => <option key={k} value={k}>{k.replace('_', ' ')}</option>)}
              </select>
              <input value={t.label} onChange={(e) => updateThreshold(i, { label: e.target.value })} placeholder="Display label (e.g. Hot)"
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none w-40" />
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <input type="number" min={0} max={100} value={t.minScore} onChange={(e) => updateThreshold(i, { minScore: Number(e.target.value) })}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none w-16" />
                <span>–</span>
                <input type="number" min={0} max={100} value={t.maxScore} onChange={(e) => updateThreshold(i, { maxScore: Number(e.target.value) })}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none w-16" />
              </div>
              <input type="color" value={t.color || '#999999'} onChange={(e) => updateThreshold(i, { color: e.target.value })}
                className="w-8 h-8 border border-gray-200 rounded-lg cursor-pointer" title="Display color" />
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                <input type="checkbox" checked={t.active !== false} onChange={(e) => updateThreshold(i, { active: e.target.checked })} /> Active
              </label>
              <button onClick={() => removeThreshold(i)} className="ml-auto text-gray-300 hover:text-red-500 transition">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {thresholds.length === 0 && <p className="text-xs text-gray-400 italic">No thresholds configured — every lead will show as Unscored.</p>}
        </div>
      </section>

      {/* Scoring rules */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#0B2560] flex items-center gap-1.5"><Flame size={15} /> Scoring Rules</h2>
          <button onClick={addRule} className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline">
            <Plus size={12} /> Add Rule
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-3 flex items-start gap-1.5">
          <Info size={13} className="shrink-0 mt-0.5" />
          Each enabled rule that matches a lead adds its points to that lead&apos;s score (0–100, clamped). Points can be negative. Leave Branch
          blank to apply everywhere.
        </p>
        <div className="space-y-2.5">
          {rules.map((r, i) => (
            <div key={r.id} className={`bg-white rounded-2xl border p-4 flex items-center gap-2.5 flex-wrap ${r.enabled !== false ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}>
              <select value={r.event} onChange={(e) => updateRule(i, { event: e.target.value })}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-semibold bg-white focus:outline-none w-56">
                {EVENTS.map((ev) => <option key={ev.key} value={ev.key}>{ev.label}</option>)}
              </select>
              <input type="number" value={r.points} onChange={(e) => updateRule(i, { points: Number(e.target.value) })}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none w-16" title="Points" />
              <input value={r.description} onChange={(e) => updateRule(i, { description: e.target.value })} placeholder="Shown in the lead's breakdown"
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none flex-1 min-w-[10rem]" />
              <input value={r.branch} onChange={(e) => updateRule(i, { branch: e.target.value })} placeholder="Branch (blank = all)"
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none w-32" />
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                <input type="checkbox" checked={r.enabled !== false} onChange={(e) => updateRule(i, { enabled: e.target.checked })} /> Enabled
              </label>
              <button onClick={() => removeRule(i)} className="ml-auto text-gray-300 hover:text-red-500 transition">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {rules.length === 0 && <p className="text-xs text-gray-400 italic">No scoring rules configured — every lead will score 0.</p>}
        </div>
      </section>
    </div>
  );
}
