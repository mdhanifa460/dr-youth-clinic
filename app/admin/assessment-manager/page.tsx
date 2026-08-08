'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, X, Save, Loader2, ClipboardList } from 'lucide-react';
import { FieldInput, StringArrayEditor } from '@/app/admin/components/FormControls';
import type { AssessmentTypeConfig, AssessmentTypeKey, NewAssessmentQuestion, ScoringCategory, SeverityBand, ContributingFactorRule, CtaRule } from '@/app/lib/assessmentTypeDefaults';

const TYPES: { key: AssessmentTypeKey; label: string; icon: string }[] = [
  { key: 'hair', label: 'Hair', icon: '💇' },
  { key: 'skin', label: 'Skin', icon: '✨' },
  { key: 'body', label: 'Body', icon: '🔥' },
];

const TABS = ['questions', 'scoring', 'settings'] as const;
type Tab = typeof TABS[number];

export default function AssessmentManagerPage() {
  const [activeType, setActiveType] = useState<AssessmentTypeKey>('hair');
  const [tab, setTab] = useState<Tab>('questions');
  const [config, setConfig] = useState<AssessmentTypeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const load = useCallback((type: AssessmentTypeKey) => {
    setLoading(true);
    fetch(`/api/admin/assessment-config?type=${type}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setConfig(d.data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(activeType); }, [activeType, load]);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    const res = await fetch('/api/admin/assessment-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: activeType, config }),
    }).then((r) => r.json());
    setSaving(false);
    if (res.success) { setConfig(res.data); setSavedAt(Date.now()); }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><ClipboardList size={22} /> AI Assessment Manager</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pre-consultation assessment — predefined questions, deterministic scoring, no treatment reveal.</p>
        </div>
        <button onClick={save} disabled={saving || loading}
          className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0d2d72] disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save {activeType}
        </button>
      </div>

      {savedAt && Date.now() - savedAt < 4000 && (
        <div className="bg-green-50 text-green-700 text-sm px-4 py-2 rounded-xl">✓ Saved</div>
      )}

      {/* Type switcher */}
      <div className="flex gap-2">
        {TYPES.map((t) => (
          <button key={t.key} onClick={() => setActiveType(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border ${activeType === t.key ? 'bg-[#0B2560] text-white border-[#0B2560]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {loading || !config ? (
        <div className="p-8 flex items-center gap-2 text-gray-400"><Loader2 className="animate-spin" size={16} /> Loading…</div>
      ) : (
        <>
          {/* Sub-tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 -mb-px ${tab === t ? 'border-[#0B2560] text-[#0B2560]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                {t === 'scoring' ? 'Scoring & Results' : t}
              </button>
            ))}
          </div>

          {tab === 'questions' && <QuestionsTab config={config} setConfig={setConfig} />}
          {tab === 'scoring' && <ScoringTab config={config} setConfig={setConfig} />}
          {tab === 'settings' && <SettingsTab config={config} setConfig={setConfig} />}
        </>
      )}
    </div>
  );
}

// ─── Questions tab ──────────────────────────────────────────────────────────

function QuestionsTab({ config, setConfig }: { config: AssessmentTypeConfig; setConfig: (c: AssessmentTypeConfig) => void }) {
  const questions = [...config.questions].sort((a, b) => a.order - b.order);

  const updateQuestion = (id: string, patch: Partial<NewAssessmentQuestion>) => {
    setConfig({ ...config, questions: config.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) });
  };
  const removeQuestion = (id: string) => {
    if (!confirm('Remove this question?')) return;
    setConfig({ ...config, questions: config.questions.filter((q) => q.id !== id) });
  };
  const addQuestion = () => {
    const id = `q-${Date.now()}`;
    setConfig({
      ...config,
      questions: [...config.questions, {
        id, title: 'New question', subtitle: '', description: '', icon: '', image: '',
        type: 'single', order: (questions[questions.length - 1]?.order || 0) + 1, required: true,
        answers: [], sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: '', conditionTags: [],
      }],
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={addQuestion} className="flex items-center gap-1.5 text-xs font-bold text-[#0B2560] hover:underline">
          <Plus size={12} /> Add Question
        </button>
      </div>
      {questions.map((q) => (
        <div key={q.id} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-gray-400">{q.id}</span>
            <button onClick={() => removeQuestion(q.id)} className="text-gray-300 hover:text-red-500"><X size={14} /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <FieldInput label="Title" value={q.title} onChange={(v) => updateQuestion(q.id, { title: v })} />
            <FieldInput label="Subtitle" value={q.subtitle} onChange={(v) => updateQuestion(q.id, { subtitle: v })} />
          </div>
          <div className="grid sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Type</label>
              <select value={q.type} onChange={(e) => updateQuestion(q.id, { type: e.target.value as any })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                {['single', 'multi', 'yesno', 'number', 'text', 'photo'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <FieldInput label="Order" type="number" value={q.order} onChange={(v) => updateQuestion(q.id, { order: Number(v) })} />
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Required</label>
              <select value={q.required ? 'yes' : 'no'} onChange={(e) => updateQuestion(q.id, { required: e.target.value === 'yes' })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                <option value="yes">Yes</option><option value="no">No</option>
              </select>
            </div>
            <FieldInput label="Show only if tag" value={q.conditionTags.join(', ')} onChange={(v) => updateQuestion(q.id, { conditionTags: v.split(',').map((s: string) => s.trim()).filter(Boolean) })} placeholder="e.g. progression-rapid" />
          </div>
          {['single', 'multi', 'yesno'].includes(q.type) && (
            <AnswersEditor question={q} onChange={(answers) => updateQuestion(q.id, { answers })} categories={config.categories} />
          )}
        </div>
      ))}
    </div>
  );
}

function AnswersEditor({ question, onChange, categories }: { question: NewAssessmentQuestion; onChange: (a: NewAssessmentQuestion['answers']) => void; categories: ScoringCategory[] }) {
  const answers = question.answers;
  const update = (i: number, patch: Partial<NewAssessmentQuestion['answers'][number]>) => {
    const next = [...answers];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () => onChange([...answers, {
    id: `a-${Date.now()}`, title: 'New answer', description: '', icon: '', image: '',
    score: 0, tags: [], weight: 0, nextQuestionId: '', riskWeight: 0, followUpQuestionIds: [],
  }]);
  const remove = (i: number) => onChange(answers.filter((_, idx) => idx !== i));

  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Answers</label>
        <button onClick={add} className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline"><Plus size={10} /> Add</button>
      </div>
      <div className="space-y-2">
        {answers.map((a, i) => (
          <div key={a.id} className="bg-white rounded-lg p-2.5 border border-gray-100">
            <div className="grid sm:grid-cols-5 gap-2 items-end">
              <input value={a.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="Answer title"
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs sm:col-span-2" />
              <input list={`cats-${question.id}`} value={a.tags.join(', ')}
                onChange={(e) => update(i, { tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                placeholder="category tag(s)"
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono" />
              <input type="number" value={a.weight} onChange={(e) => update(i, { weight: Number(e.target.value) })}
                placeholder="weight" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" title="Concern weight" />
              <div className="flex items-center gap-1">
                <input type="number" value={a.riskWeight} onChange={(e) => update(i, { riskWeight: Number(e.target.value) })}
                  placeholder="risk" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs flex-1" title="Risk weight" />
                <button onClick={() => remove(i)} className="text-gray-300 hover:text-red-500 shrink-0"><X size={13} /></button>
              </div>
            </div>
            <datalist id={`cats-${question.id}`}>
              {categories.map((c) => <option key={c.key} value={c.key} />)}
            </datalist>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 mt-2">Category tag = which Scoring &amp; Results category this answer counts toward. Weight = Concern %. Risk = Risk Level % (separate dimension).</p>
    </div>
  );
}

// ─── Scoring & Results tab ──────────────────────────────────────────────────

function ScoringTab({ config, setConfig }: { config: AssessmentTypeConfig; setConfig: (c: AssessmentTypeConfig) => void }) {
  const set = <K extends keyof AssessmentTypeConfig>(key: K, val: AssessmentTypeConfig[K]) => setConfig({ ...config, [key]: val });

  return (
    <div className="space-y-6">
      <Section title="Result Headline & Disclaimer">
        <FieldInput label="Headline" value={config.resultTemplate.headline} onChange={(v) => set('resultTemplate', { ...config.resultTemplate, headline: v })} />
        <FieldInput label="Disclaimer" type="textarea" value={config.resultTemplate.disclaimer} onChange={(v) => set('resultTemplate', { ...config.resultTemplate, disclaimer: v })} />
      </Section>

      <Section title="Categories (the % bars shown on results)">
        <ListEditor
          items={config.categories}
          onChange={(items) => set('categories', items as ScoringCategory[])}
          newItem={{ key: '', label: '', maxWeight: 100, importance: 1, order: config.categories.length + 1 }}
          renderRow={(cat, update) => (
            <div className="grid sm:grid-cols-5 gap-2">
              <input value={cat.key} onChange={(e) => update({ key: e.target.value })} placeholder="tag key" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono" />
              <input value={cat.label} onChange={(e) => update({ label: e.target.value })} placeholder="Label — e.g. Hair Fall Impact" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs sm:col-span-2" />
              <input type="number" value={cat.maxWeight} onChange={(e) => update({ maxWeight: Number(e.target.value) })} placeholder="max weight" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
              <input type="number" value={cat.importance} onChange={(e) => update({ importance: Number(e.target.value) })} placeholder="importance" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
            </div>
          )}
        />
      </Section>

      <Section title="Severity Thresholds (Concern Level)" note="Not medically validated — a qualified professional should confirm these before this goes live.">
        <BandEditor bands={config.severityThresholds} onChange={(b) => set('severityThresholds', b)} />
      </Section>

      <Section title="Risk Thresholds (Risk Level)">
        <BandEditor bands={config.riskThresholds} onChange={(b) => set('riskThresholds', b)} />
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <StringArrayEditor label="Risk factor tags" items={config.riskFactorTags} onChange={(v) => set('riskFactorTags', v)} />
          <FieldInput label="Risk max weight (normalizes to 100%)" type="number" value={config.riskMaxWeight} onChange={(v) => set('riskMaxWeight', Number(v))} />
        </div>
      </Section>

      <Section title="Possible Contributing Factors">
        <ListEditor
          items={config.contributingFactorRules}
          onChange={(items) => set('contributingFactorRules', items as ContributingFactorRule[])}
          newItem={{ tag: '', label: '', detail: '' }}
          renderRow={(rule, update) => (
            <div className="grid sm:grid-cols-3 gap-2">
              <input value={rule.tag} onChange={(e) => update({ tag: e.target.value })} placeholder="tag" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono" />
              <input value={rule.label} onChange={(e) => update({ label: e.target.value })} placeholder="Label — e.g. Family history" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
              <input value={rule.detail} onChange={(e) => update({ detail: e.target.value })} placeholder="One-sentence detail" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
            </div>
          )}
        />
      </Section>

      <Section title="Severity-Based CTA">
        {config.ctaRules.map((rule, i) => (
          <div key={rule.severity} className="bg-gray-50 rounded-xl p-3 space-y-2 mb-2">
            <p className="text-xs font-bold text-gray-500">{rule.severity}</p>
            <FieldInput label="Headline" value={rule.headline} onChange={(v) => {
              const next = [...config.ctaRules]; next[i] = { ...next[i], headline: v }; set('ctaRules', next);
            }} />
            <FieldInput label="Body" type="textarea" value={rule.body} onChange={(v) => {
              const next = [...config.ctaRules]; next[i] = { ...next[i], body: v }; set('ctaRules', next);
            }} />
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Buttons</label>
              {rule.buttons.map((btn, bi) => (
                <div key={bi} className="grid sm:grid-cols-3 gap-2 mb-1.5">
                  <input value={btn.label} onChange={(e) => {
                    const next = [...config.ctaRules]; const buttons = [...next[i].buttons]; buttons[bi] = { ...buttons[bi], label: e.target.value }; next[i] = { ...next[i], buttons }; set('ctaRules', next);
                  }} placeholder="Button label" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                  <select value={btn.type} onChange={(e) => {
                    const next = [...config.ctaRules]; const buttons = [...next[i].buttons]; buttons[bi] = { ...buttons[bi], type: e.target.value as any }; next[i] = { ...next[i], buttons }; set('ctaRules', next);
                  }} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
                    <option value="book">Book Consultation</option>
                    <option value="content">Link to content</option>
                  </select>
                  <input value={btn.href || ''} onChange={(e) => {
                    const next = [...config.ctaRules]; const buttons = [...next[i].buttons]; buttons[bi] = { ...buttons[bi], href: e.target.value }; next[i] = { ...next[i], buttons }; set('ctaRules', next);
                  }} placeholder="/blog (if content link)" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {note && <p className="text-xs text-amber-600 mt-0.5">{note}</p>}
      </div>
      {children}
    </div>
  );
}

function BandEditor({ bands, onChange }: { bands: SeverityBand[]; onChange: (b: SeverityBand[]) => void }) {
  const update = (i: number, patch: Partial<SeverityBand>) => {
    const next = [...bands]; next[i] = { ...next[i], ...patch }; onChange(next);
  };
  return (
    <div className="space-y-2">
      {bands.map((b, i) => (
        <div key={i} className="grid grid-cols-3 gap-2">
          <input type="number" value={b.min} onChange={(e) => update(i, { min: Number(e.target.value) })} placeholder="min" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
          <input type="number" value={b.max} onChange={(e) => update(i, { max: Number(e.target.value) })} placeholder="max" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
          <input value={b.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Label" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-semibold" />
        </div>
      ))}
    </div>
  );
}

function ListEditor<T extends Record<string, any>>({ items, onChange, newItem, renderRow }: {
  items: T[]; onChange: (items: T[]) => void; newItem: T; renderRow: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex-1">{renderRow(item, (patch) => { const next = [...items]; next[i] = { ...next[i], ...patch }; onChange(next); })}</div>
          <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500 mt-1.5"><X size={13} /></button>
        </div>
      ))}
      <button onClick={() => onChange([...items, newItem])} className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline">
        <Plus size={10} /> Add
      </button>
    </div>
  );
}

// ─── Settings tab ────────────────────────────────────────────────────────────

function SettingsTab({ config, setConfig }: { config: AssessmentTypeConfig; setConfig: (c: AssessmentTypeConfig) => void }) {
  return (
    <Section title="Status">
      <label className="flex items-center gap-3 cursor-pointer">
        <div onClick={() => setConfig({ ...config, active: !config.active })}
          className="rounded-full transition-colors shrink-0" style={{ width: 40, height: 22, background: config.active ? '#0B2560' : '#d1d5db' }}>
          <div className="w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform mt-[3px]" style={{ width: 16, height: 16, transform: config.active ? 'translateX(21px)' : 'translateX(3px)' }} />
        </div>
        <span className="text-sm text-gray-700">{config.active ? 'Active — visible in the body-area selector' : 'Inactive — hidden from patients'}</span>
      </label>
      <p className="text-xs text-gray-400">Version: {config.version} · Icon: {config.icon} · Colors: {config.colorFrom} → {config.colorTo}</p>
    </Section>
  );
}
