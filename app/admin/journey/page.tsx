'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Loader2, Compass, Sliders, ShieldAlert } from 'lucide-react';

interface JourneyGoal {
  slug: string;
  label: string;
  icon: string;
  heroGrad: string;
  category: 'Skin' | 'Hair' | 'Laser' | 'Other';
  nameFilterSource: string;
  doctorRegexSource: string;
  concernTags: string[];
  ctaLabel: string;
  order: number;
  enabled: boolean;
}

interface JourneyConfigData {
  _id?: string;
  goals: JourneyGoal[];
  enablePhotoCapture: boolean;
  enableAiObservations: boolean;
  aiObservationsDisclaimer: string;
  costPlanningNote: string;
}

const CATEGORIES: JourneyGoal['category'][] = ['Skin', 'Hair', 'Laser', 'Other'];

function uid() {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 8);
}

function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: () => void; label: string; sub?: string }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer py-1" onClick={onChange}>
      <div>
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className={`relative rounded-full transition-colors shrink-0 ${checked ? 'bg-green-500' : 'bg-gray-200'}`} style={{ width: '40px', height: '22px' }}>
        <div className="absolute top-0.5 bg-white rounded-full shadow transition-transform"
          style={{ width: '18px', height: '18px', transform: checked ? 'translateX(18px)' : 'translateX(2px)' }} />
      </div>
    </label>
  );
}

function Card({ title, icon: Icon, sub, children }: { title: string; icon?: any; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 shadow-sm space-y-4">
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">{Icon && <Icon size={13} />} {title}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export default function JourneyConfigPage() {
  const [config, setConfig] = useState<JourneyConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/journey')
      .then((r) => r.json())
      .then((d) => { if (d.success) setConfig(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof JourneyConfigData>(k: K, v: JourneyConfigData[K]) => {
    setConfig((c) => (c ? { ...c, [k]: v } : c));
  };

  const setGoal = (i: number, patch: Partial<JourneyGoal>) => {
    setConfig((c) => {
      if (!c) return c;
      const goals = [...c.goals];
      goals[i] = { ...goals[i], ...patch };
      return { ...c, goals };
    });
  };

  const addGoal = () => {
    setConfig((c) => {
      if (!c) return c;
      const goal: JourneyGoal = {
        slug: `goal-${uid()}`, label: 'New Goal', icon: '✨', heroGrad: 'from-[#0B2560] via-[#1a3a6e] to-[#3B82C4]',
        category: 'Other', nameFilterSource: '', doctorRegexSource: '', concernTags: [], ctaLabel: 'Start My Journey',
        order: c.goals.length + 1, enabled: true,
      };
      return { ...c, goals: [...c.goals, goal] };
    });
  };

  const removeGoal = (i: number) => {
    setConfig((c) => (c ? { ...c, goals: c.goals.filter((_, idx) => idx !== i) } : c));
  };

  const moveGoal = (i: number, dir: -1 | 1) => {
    setConfig((c) => {
      if (!c) return c;
      const goals = [...c.goals];
      const j = i + dir;
      if (j < 0 || j >= goals.length) return c;
      [goals[i], goals[j]] = [goals[j], goals[i]];
      return { ...c, goals: goals.map((g, idx) => ({ ...g, order: idx + 1 })) };
    });
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/journey', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) { setConfig(data.data); setSaved(true); setTimeout(() => setSaved(false), 2500); }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400 text-center py-10">Loading…</p>;
  if (!config) return <p className="text-sm text-red-500 text-center py-10">Failed to load journey config.</p>;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">🧭 AI Beauty Journey</h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure the goals, doctor-matching rules, and CTA text patients see at <code>/plan-my-journey</code> — no code changes needed to add or edit a goal.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition disabled:opacity-50 shrink-0"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <Card title="Module Toggles" icon={Sliders} sub="Turn a module off clinic-wide without a code change.">
        <Toggle checked={config.enablePhotoCapture} onChange={() => set('enablePhotoCapture', !config.enablePhotoCapture)}
          label="AI Photo Capture" sub="Lets a patient upload/capture photos as part of their journey." />
        <Toggle checked={config.enableAiObservations} onChange={() => set('enableAiObservations', !config.enableAiObservations)}
          label="AI Observations" sub="Shows general AI observations from those photos — always paired with the disclaimer below, never a diagnosis." />
      </Card>

      <Card title="AI Observations Disclaimer" icon={ShieldAlert}
        sub="Always shown to the patient before AI Observations, and the patient must acknowledge it to proceed. Editable, but never skippable.">
        <textarea
          value={config.aiObservationsDisclaimer}
          onChange={(e) => set('aiObservationsDisclaimer', e.target.value)}
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 resize-none"
        />
      </Card>

      <Card title="Cost Planning Note">
        <textarea
          value={config.costPlanningNote}
          onChange={(e) => set('costPlanningNote', e.target.value)}
          rows={2}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 resize-none"
        />
      </Card>

      <Card title="Goals" icon={Compass} sub="Each card a patient picks from on the journey's first screen. Order here is the display order.">
        <div className="space-y-4">
          {config.goals.map((g, i) => (
            <div key={g.slug} className="border border-gray-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                  <input type="checkbox" checked={g.enabled} onChange={(e) => setGoal(i, { enabled: e.target.checked })} /> Enabled
                </label>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveGoal(i, -1)} disabled={i === 0} className="text-gray-300 hover:text-[#0B2560] disabled:opacity-30 disabled:hover:text-gray-300"><ArrowUp size={14} /></button>
                  <button onClick={() => moveGoal(i, 1)} disabled={i === config.goals.length - 1} className="text-gray-300 hover:text-[#0B2560] disabled:opacity-30 disabled:hover:text-gray-300"><ArrowDown size={14} /></button>
                  <button onClick={() => removeGoal(i)} className="text-gray-300 hover:text-red-500 ml-1"><Trash2 size={14} /></button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input value={g.icon} onChange={(e) => setGoal(i, { icon: e.target.value })} placeholder="Icon (emoji)"
                  className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
                <input value={g.label} onChange={(e) => setGoal(i, { label: e.target.value })} placeholder="Label"
                  className="col-span-2 border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
                <select value={g.category} onChange={(e) => setGoal(i, { category: e.target.value as JourneyGoal['category'] })}
                  className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input value={g.ctaLabel} onChange={(e) => setGoal(i, { ctaLabel: e.target.value })} placeholder="CTA text (e.g. Start My Hair Journey)"
                  className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
                <input value={g.heroGrad} onChange={(e) => setGoal(i, { heroGrad: e.target.value })} placeholder="Tailwind gradient classes"
                  className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-mono" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 mb-1 block">Doctor match (regex, matched against specializations)</label>
                  <input value={g.doctorRegexSource} onChange={(e) => setGoal(i, { doctorRegexSource: e.target.value })} placeholder="e.g. hair|trichol"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 mb-1 block">Service name filter (regex, optional)</label>
                  <input value={g.nameFilterSource} onChange={(e) => setGoal(i, { nameFilterSource: e.target.value })} placeholder="e.g. weight"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-mono" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-400 mb-1 block">Concern tags (comma separated — bridges to Clinical Intake questions)</label>
                <input
                  value={g.concernTags.join(', ')}
                  onChange={(e) => setGoal(i, { concernTags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  placeholder="e.g. acne, pigmentation, ageing"
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs"
                />
              </div>
            </div>
          ))}
        </div>
        <button onClick={addGoal} className="mt-3 text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline">
          <Plus size={12} /> Add Goal
        </button>
      </Card>
    </div>
  );
}
