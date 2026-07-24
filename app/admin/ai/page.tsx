'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bot, Database, MessageSquare, BarChart3, RefreshCw, Plus, Trash2,
  ChevronRight, Loader2, CheckCircle, AlertCircle, X, MessageCircle,
  Save, Sparkles, Sliders, Palette, Building2, Gauge, Compass,
  ThumbsUp, ThumbsDown, LayoutDashboard, Stethoscope,
} from 'lucide-react';

type Tab =
  | 'dashboard' | 'chatbot' | 'greetings' | 'questions' | 'knowledge'
  | 'prompts' | 'recommendations' | 'actions' | 'assessment' | 'model'
  | 'conversations' | 'analytics' | 'feedback';

// ── Shared AI config types (mirrors app/models/Settings.ts's `ai` + `clinicProfile`) ──
type ClinicProfile = { name: string; country: string; currencySymbol: string };
const CLINIC_PROFILE_DEFAULTS: ClinicProfile = { name: 'DR Youth Clinic', country: 'India', currencySymbol: '₹' };

type QuickAction = { label: string; action: string; branch?: string };
type GreetingRule = {
  id: string; enabled: boolean;
  type: 'time_of_day' | 'date_range' | 'returning_visitor' | 'new_visitor' | 'branch';
  startHour?: number; endHour?: number; startDate?: string; endDate?: string;
  campaignParam?: string; branch?: string;
  greeting: string; welcomeMessage?: string; priority: number;
};
type RecommendationRule = {
  id: string; enabled: boolean; matchKeywords: string[];
  preferredTypes: Array<'doctor' | 'service' | 'offer' | 'result'>;
  minScore?: number; priority: number;
};
type EscalationRule = { id: string; enabled: boolean; matchKeywords: string[]; message: string; priority: number };

type AiSettings = {
  enabled: boolean;
  greeting: string;
  welcomeMessage: string;
  systemPrompt: string;
  recommendationPrompt: string;
  model: string;
  temperature: number;
  theme: 'luxury' | 'minimal' | 'vibrant';
  suggestedQuestions: string[];
  suggestedQuestionsByBranch: Record<string, string[]>;
  quickActions: QuickAction[];
  enableRecommendations: boolean;
  enableBooking: boolean;
  enableWhatsappHandoff: boolean;
  greetingRules: GreetingRule[];
  recommendationRules: RecommendationRule[];
  escalationRules: EscalationRule[];
};

const DEFAULTS: AiSettings = {
  enabled: true,
  greeting: "Hi! I'm the DR Youth Clinic assistant 👋",
  welcomeMessage: "Ask me about treatments, doctors, offers, or book a consultation.",
  systemPrompt: "You are the DR Youth Clinic assistant. Be warm, concise, and helpful. Ground every factual claim in the provided context — never invent prices, doctor names, or availability.",
  recommendationPrompt: "Given the patient's concern and the retrieved context, suggest the most relevant treatment, doctor, or offer. Explain briefly why it fits.",
  model: 'claude-haiku-4-5-20251001',
  temperature: 0.4,
  theme: 'luxury',
  suggestedQuestions: [
    'What treatments do you offer for acne scars?',
    'Do you have any current offers?',
    'How do I book a consultation?',
  ],
  suggestedQuestionsByBranch: {},
  quickActions: [
    { label: '📅 Book Appointment', action: '/book' },
    { label: '🧪 Take Skin Quiz', action: '/skin-quiz' },
    { label: '🏷️ View Offers', action: '/offers' },
  ],
  enableRecommendations: true,
  enableBooking: true,
  enableWhatsappHandoff: true,
  greetingRules: [],
  recommendationRules: [],
  escalationRules: [],
};

function uid() {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
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

// ── Chatbot Settings tab ─────────────────────────────────────────────────
function ChatbotSettingsTab({ form, set, clinicProfile, setProfile }: {
  form: AiSettings; set: <K extends keyof AiSettings>(k: K, v: AiSettings[K]) => void;
  clinicProfile: ClinicProfile; setProfile: <K extends keyof ClinicProfile>(k: K, v: ClinicProfile[K]) => void;
}) {
  return (
    <>
      <Card title="Enable" icon={Bot}>
        <Toggle checked={form.enabled} onChange={() => set('enabled', !form.enabled)}
          label="Enable AI Assistant" sub="Turns the floating chat widget on/off across the entire public site." />
      </Card>

      <Card title="Clinic Identity" icon={Building2}
        sub="Used by AI features that mention your clinic by name — the Clinical Assessment chat and knowledge-base content generated from your locations and offers.">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Clinic Name</label>
            <input value={clinicProfile.name} onChange={e => setProfile('name', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Country</label>
            <input value={clinicProfile.country} onChange={e => setProfile('country', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
          </div>
        </div>
        <div className="w-1/2 pr-1.5">
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Currency Symbol</label>
          <input value={clinicProfile.currencySymbol} onChange={e => setProfile('currencySymbol', e.target.value)} maxLength={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
        </div>
      </Card>

      <Card title="Theme" icon={Palette}>
        <div className="flex gap-2">
          {(['luxury', 'minimal', 'vibrant'] as const).map(t => (
            <button key={t} onClick={() => set('theme', t)}
              className={`flex-1 text-xs font-bold px-3 py-2.5 rounded-xl capitalize transition ${
                form.theme === t ? 'bg-[#0B2560] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Features" icon={Sliders}>
        <Toggle checked={form.enableRecommendations} onChange={() => set('enableRecommendations', !form.enableRecommendations)}
          label="Recommendations" sub="Doctor / service / offer / result cards suggested in chat." />
        <Toggle checked={form.enableBooking} onChange={() => set('enableBooking', !form.enableBooking)}
          label="Booking CTA" sub="Show a Book Appointment button in chat responses." />
        <Toggle checked={form.enableWhatsappHandoff} onChange={() => set('enableWhatsappHandoff', !form.enableWhatsappHandoff)}
          label="WhatsApp Handoff" sub="Offer to continue the conversation on WhatsApp." />
      </Card>
    </>
  );
}

// ── Greetings tab ─────────────────────────────────────────────────────────
const GREETING_RULE_TYPES: [GreetingRule['type'], string][] = [
  ['time_of_day', 'Time of Day'],
  ['date_range', 'Date Range / Festival / Campaign'],
  ['returning_visitor', 'Returning Visitor'],
  ['new_visitor', 'New Visitor'],
  ['branch', 'Branch'],
];

function GreetingsTab({ form, set }: { form: AiSettings; set: <K extends keyof AiSettings>(k: K, v: AiSettings[K]) => void }) {
  const setRule = (i: number, patch: Partial<GreetingRule>) => {
    const next = [...form.greetingRules]; next[i] = { ...next[i], ...patch }; set('greetingRules', next);
  };
  const addRule = () => set('greetingRules', [...form.greetingRules, {
    id: uid(), enabled: true, type: 'time_of_day', startHour: 6, endHour: 12, greeting: '', welcomeMessage: '', priority: 1,
  }]);
  const removeRule = (i: number) => set('greetingRules', form.greetingRules.filter((_, idx) => idx !== i));

  return (
    <>
      <Card title="Default Greeting" icon={MessageSquare} sub="Shown when no rule below matches — the always-on fallback.">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Greeting (first line shown when the chat opens)</label>
          <input value={form.greeting} onChange={e => set('greeting', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Welcome Message (subtitle)</label>
          <textarea value={form.welcomeMessage} onChange={e => set('welcomeMessage', e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 resize-none" />
        </div>
      </Card>

      <Card title="Greeting Rules" icon={Compass}
        sub="Time-of-day, festival/campaign date windows, returning vs. new visitors, or a specific branch (via ?location=/?clinic= in the URL) — the highest-priority matching enabled rule overrides the default above.">
        <div className="space-y-3">
          {form.greetingRules.map((r, i) => (
            <div key={r.id} className="border border-gray-100 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                  <input type="checkbox" checked={r.enabled} onChange={e => setRule(i, { enabled: e.target.checked })} /> Enabled
                </label>
                <button onClick={() => removeRule(i)} className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 size={14} /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={r.type} onChange={e => setRule(i, { type: e.target.value as GreetingRule['type'] })}
                  className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs">
                  {GREETING_RULE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <input type="number" value={r.priority} onChange={e => setRule(i, { priority: Number(e.target.value) })}
                  placeholder="Priority (higher wins)" className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
              </div>

              {r.type === 'time_of_day' && (
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min={0} max={23} value={r.startHour ?? 0} onChange={e => setRule(i, { startHour: Number(e.target.value) })}
                    placeholder="Start hour (0-23)" className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
                  <input type="number" min={0} max={23} value={r.endHour ?? 0} onChange={e => setRule(i, { endHour: Number(e.target.value) })}
                    placeholder="End hour (0-23)" className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
                </div>
              )}
              {r.type === 'date_range' && (
                <div className="grid grid-cols-3 gap-2">
                  <input type="date" value={r.startDate ?? ''} onChange={e => setRule(i, { startDate: e.target.value })}
                    className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
                  <input type="date" value={r.endDate ?? ''} onChange={e => setRule(i, { endDate: e.target.value })}
                    className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
                  <input value={r.campaignParam ?? ''} onChange={e => setRule(i, { campaignParam: e.target.value })}
                    placeholder="?campaign= value (optional)" className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
                </div>
              )}
              {r.type === 'branch' && (
                <input value={r.branch ?? ''} onChange={e => setRule(i, { branch: e.target.value })}
                  placeholder="Branch key (e.g. kochi)" className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
              )}

              <input value={r.greeting} onChange={e => setRule(i, { greeting: e.target.value })}
                placeholder="Greeting text" className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
              <input value={r.welcomeMessage ?? ''} onChange={e => setRule(i, { welcomeMessage: e.target.value })}
                placeholder="Welcome message (optional)" className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
            </div>
          ))}
          {form.greetingRules.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No rules yet — the default greeting above always applies.</p>}
        </div>
        <button onClick={addRule} className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline"><Plus size={12} /> Add Rule</button>
      </Card>
    </>
  );
}

// ── Suggested Questions tab ──────────────────────────────────────────────
function SuggestedQuestionsTab({ form, set }: { form: AiSettings; set: <K extends keyof AiSettings>(k: K, v: AiSettings[K]) => void }) {
  const setQuestion = (i: number, val: string) => {
    const next = [...form.suggestedQuestions]; next[i] = val; set('suggestedQuestions', next);
  };
  const addQuestion = () => set('suggestedQuestions', [...form.suggestedQuestions, '']);
  const removeQuestion = (i: number) => set('suggestedQuestions', form.suggestedQuestions.filter((_, idx) => idx !== i));

  const branches = Object.keys(form.suggestedQuestionsByBranch);
  const [newBranch, setNewBranch] = useState('');

  const addBranch = () => {
    const key = newBranch.trim().toLowerCase();
    if (!key || form.suggestedQuestionsByBranch[key]) return;
    set('suggestedQuestionsByBranch', { ...form.suggestedQuestionsByBranch, [key]: [''] });
    setNewBranch('');
  };
  const removeBranch = (key: string) => {
    const next = { ...form.suggestedQuestionsByBranch }; delete next[key]; set('suggestedQuestionsByBranch', next);
  };
  const setBranchQuestion = (key: string, i: number, val: string) => {
    const list = [...form.suggestedQuestionsByBranch[key]]; list[i] = val;
    set('suggestedQuestionsByBranch', { ...form.suggestedQuestionsByBranch, [key]: list });
  };
  const addBranchQuestion = (key: string) => {
    set('suggestedQuestionsByBranch', { ...form.suggestedQuestionsByBranch, [key]: [...form.suggestedQuestionsByBranch[key], ''] });
  };
  const removeBranchQuestion = (key: string, i: number) => {
    set('suggestedQuestionsByBranch', { ...form.suggestedQuestionsByBranch, [key]: form.suggestedQuestionsByBranch[key].filter((_, idx) => idx !== i) });
  };

  return (
    <>
      <Card title="Suggested Questions" sub="Shown as tap-to-ask chips before the first message.">
        <div className="space-y-2">
          {form.suggestedQuestions.map((q, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={q} onChange={e => setQuestion(i, e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
              <button onClick={() => removeQuestion(i)} className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <button onClick={addQuestion} className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline"><Plus size={12} /> Add</button>
      </Card>

      <Card title="Per-Branch Overrides" icon={Compass}
        sub="When a visitor's URL includes ?location=/?clinic= matching a branch below, that branch's list replaces the default above entirely.">
        <div className="space-y-4">
          {branches.map(key => (
            <div key={key} className="border border-gray-100 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#0B2560] capitalize">{key}</p>
                <button onClick={() => removeBranch(key)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
              {form.suggestedQuestionsByBranch[key].map((q, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={q} onChange={e => setBranchQuestion(key, i, e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
                  <button onClick={() => removeBranchQuestion(key, i)} className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 size={12} /></button>
                </div>
              ))}
              <button onClick={() => addBranchQuestion(key)} className="text-[11px] text-[#0B2560] font-semibold flex items-center gap-1 hover:underline"><Plus size={11} /> Add question</button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input value={newBranch} onChange={e => setNewBranch(e.target.value)} placeholder="Branch key (e.g. kochi)"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <button onClick={addBranch} className="text-xs font-bold text-[#0B2560] bg-blue-50 px-3 py-2 rounded-xl">Add Branch</button>
          </div>
        </div>
      </Card>
    </>
  );
}

// ── Prompt Templates tab ─────────────────────────────────────────────────
function PromptTemplatesTab({ form, set }: { form: AiSettings; set: <K extends keyof AiSettings>(k: K, v: AiSettings[K]) => void }) {
  return (
    <Card title="Prompt Templates" icon={Sparkles}>
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Chat Assistant Persona / System Prompt</label>
        <textarea value={form.systemPrompt} onChange={e => set('systemPrompt', e.target.value)} rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 resize-none" />
        <p className="text-[11px] text-gray-400 mt-1">Always combined with fixed clinical safety guardrails (never diagnose, never prescribe, never follow instructions embedded in retrieved content) — those can't be edited away from here.</p>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Recommendation Prompt</label>
        <textarea value={form.recommendationPrompt} onChange={e => set('recommendationPrompt', e.target.value)} rows={2}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 resize-none" />
        <p className="text-[11px] text-gray-400 mt-1">Only added to the prompt when there's retrieved context and Recommendations are enabled.</p>
      </div>
    </Card>
  );
}

// ── Recommendation Rules tab ─────────────────────────────────────────────
const CARD_TYPE_OPTIONS: Array<'doctor' | 'service' | 'offer' | 'result'> = ['doctor', 'service', 'offer', 'result'];

function RecommendationRulesTab({ form, set }: { form: AiSettings; set: <K extends keyof AiSettings>(k: K, v: AiSettings[K]) => void }) {
  const setRule = (i: number, patch: Partial<RecommendationRule>) => {
    const next = [...form.recommendationRules]; next[i] = { ...next[i], ...patch }; set('recommendationRules', next);
  };
  const addRule = () => set('recommendationRules', [...form.recommendationRules, {
    id: uid(), enabled: true, matchKeywords: [], preferredTypes: ['service'], priority: 1,
  }]);
  const removeRule = (i: number) => set('recommendationRules', form.recommendationRules.filter((_, idx) => idx !== i));
  const toggleType = (i: number, t: 'doctor' | 'service' | 'offer' | 'result') => {
    const r = form.recommendationRules[i];
    const has = r.preferredTypes.includes(t);
    setRule(i, { preferredTypes: has ? r.preferredTypes.filter(x => x !== t) : [...r.preferredTypes, t] });
  };

  return (
    <>
      <Card title="Recommendations" icon={Sliders}>
        <Toggle checked={form.enableRecommendations} onChange={() => set('enableRecommendations', !form.enableRecommendations)}
          label="Enable Recommendations" sub="Master switch — turns off both the default behavior and every rule below." />
      </Card>

      <Card title="Recommendation Rules" icon={Gauge}
        sub="When the patient's message contains one of a rule's keywords, that rule's card types/threshold override the default (doctor, service, offer, result at 0.72) for that reply only. Highest priority match wins.">
        <div className="space-y-3">
          {form.recommendationRules.map((r, i) => (
            <div key={r.id} className="border border-gray-100 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                  <input type="checkbox" checked={r.enabled} onChange={e => setRule(i, { enabled: e.target.checked })} /> Enabled
                </label>
                <button onClick={() => removeRule(i)} className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 size={14} /></button>
              </div>
              <input value={r.matchKeywords.join(', ')} onChange={e => setRule(i, { matchKeywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="Keywords, comma separated (e.g. hair, bald, thinning)" className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
              <div className="flex flex-wrap gap-1.5">
                {CARD_TYPE_OPTIONS.map(t => (
                  <button key={t} onClick={() => toggleType(i, t)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize transition ${
                      r.preferredTypes.includes(t) ? 'bg-[#0B2560] text-white' : 'bg-gray-100 text-gray-500'
                    }`}>{t}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" step={0.01} min={0} max={1} value={r.minScore ?? ''} onChange={e => setRule(i, { minScore: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="Min score override (default 0.72)" className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
                <input type="number" value={r.priority} onChange={e => setRule(i, { priority: Number(e.target.value) })}
                  placeholder="Priority" className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
              </div>
            </div>
          ))}
          {form.recommendationRules.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No rules yet — every reply uses the default card types/threshold.</p>}
        </div>
        <button onClick={addRule} className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline"><Plus size={12} /> Add Rule</button>
      </Card>

      <Card title="Escalation Rules" icon={AlertCircle}
        sub="When the patient's message matches one of these keywords, the assistant is nudged to acknowledge the topic carefully and proactively offer a human handoff, rather than trying to fully resolve it itself. The reply is also flagged for the Feedback/Analytics tabs.">
        <EscalationRulesEditor form={form} set={set} />
      </Card>
    </>
  );
}

function EscalationRulesEditor({ form, set }: { form: AiSettings; set: <K extends keyof AiSettings>(k: K, v: AiSettings[K]) => void }) {
  const setRule = (i: number, patch: Partial<EscalationRule>) => {
    const next = [...form.escalationRules]; next[i] = { ...next[i], ...patch }; set('escalationRules', next);
  };
  const addRule = () => set('escalationRules', [...form.escalationRules, { id: uid(), enabled: true, matchKeywords: [], message: '', priority: 1 }]);
  const removeRule = (i: number) => set('escalationRules', form.escalationRules.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {form.escalationRules.map((r, i) => (
        <div key={r.id} className="border border-gray-100 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
              <input type="checkbox" checked={r.enabled} onChange={e => setRule(i, { enabled: e.target.checked })} /> Enabled
            </label>
            <button onClick={() => removeRule(i)} className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 size={14} /></button>
          </div>
          <input value={r.matchKeywords.join(', ')} onChange={e => setRule(i, { matchKeywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="Keywords, comma separated (e.g. complaint, refund, angry)" className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
          <textarea value={r.message} onChange={e => setRule(i, { message: e.target.value })} rows={2}
            placeholder="Instruction for the assistant when this matches (e.g. 'Acknowledge with empathy, then offer WhatsApp/phone follow-up.')"
            className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs resize-none" />
          <input type="number" value={r.priority} onChange={e => setRule(i, { priority: Number(e.target.value) })}
            placeholder="Priority" className="w-1/3 border border-gray-200 rounded-lg px-2.5 py-2 text-xs" />
        </div>
      ))}
      {form.escalationRules.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No escalation rules yet.</p>}
      <button onClick={addRule} className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline"><Plus size={12} /> Add Rule</button>
    </div>
  );
}

// ── Quick Actions tab ─────────────────────────────────────────────────────
function QuickActionsTab({ form, set }: { form: AiSettings; set: <K extends keyof AiSettings>(k: K, v: AiSettings[K]) => void }) {
  const setAction = (i: number, key: keyof QuickAction, val: string) => {
    const next = [...form.quickActions]; next[i] = { ...next[i], [key]: val }; set('quickActions', next);
  };
  const addAction = () => set('quickActions', [...form.quickActions, { label: '', action: '', branch: '' }]);
  const removeAction = (i: number) => set('quickActions', form.quickActions.filter((_, idx) => idx !== i));

  return (
    <Card title="Quick Actions" sub="Buttons shown above the chat input. Booking/Offers/Skin Quiz paths render inline in the widget; any other path navigates normally. Leave Branch blank to show everywhere.">
      <div className="space-y-2">
        {form.quickActions.map((a, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={a.label} onChange={e => setAction(i, 'label', e.target.value)} placeholder="Label"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
            <input value={a.action} onChange={e => setAction(i, 'action', e.target.value)} placeholder="/path"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
            <input value={a.branch ?? ''} onChange={e => setAction(i, 'branch', e.target.value)} placeholder="Branch (optional)"
              className="w-28 shrink-0 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
            <button onClick={() => removeAction(i)} className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <button onClick={addAction} className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline"><Plus size={12} /> Add</button>
    </Card>
  );
}

// ── Model & Embeddings tab ───────────────────────────────────────────────
function ModelEmbeddingsTab({ form, set }: { form: AiSettings; set: <K extends keyof AiSettings>(k: K, v: AiSettings[K]) => void }) {
  return (
    <Card title="LLM &amp; Embedding Configuration" icon={Sliders}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Chat Model</label>
          <select value={form.model} onChange={e => set('model', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20">
            <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (fast, default)</option>
            <option value="claude-sonnet-5">Claude Sonnet 5 (slower, higher quality)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Temperature ({form.temperature.toFixed(1)})</label>
          <input type="range" min={0} max={1} step={0.1} value={form.temperature}
            onChange={e => set('temperature', Number(e.target.value))}
            className="w-full mt-3" />
        </div>
      </div>
      <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
        <p className="text-xs text-gray-500"><strong className="text-gray-600">Embedding model:</strong> gemini-embedding-001 (3072-dim, fixed)</p>
        <p className="text-[11px] text-gray-400 mt-0.5">Not editable here — the Atlas vector index is provisioned for this exact model/dimension. Changing it requires rebuilding the knowledge base index.</p>
      </div>
    </Card>
  );
}

// ── Clinical Assessment AI tab (link-out — reuses the existing Skin Quiz / Clinical Intake module rather than duplicating it) ──
function ClinicalAssessmentTab() {
  return (
    <Card title="Clinical Assessment AI" icon={Stethoscope}
      sub="The Skin Quiz / Clinical Intake assessment already has its own dedicated configuration module — kept separate rather than duplicated here.">
      <div className="grid sm:grid-cols-2 gap-3">
        <Link href="/admin/quiz" className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3.5 hover:border-blue-200 hover:bg-blue-50/40 transition">
          <div>
            <p className="text-sm font-bold text-[#0B2560]">Quiz Configuration</p>
            <p className="text-xs text-gray-400 mt-0.5">Questions, scoring, and treatment mapping.</p>
          </div>
          <ChevronRight size={16} className="text-gray-300" />
        </Link>
        <Link href="/admin/ai-assessment" className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3.5 hover:border-blue-200 hover:bg-blue-50/40 transition">
          <div>
            <p className="text-sm font-bold text-[#0B2560]">Assessment AI Tools</p>
            <p className="text-xs text-gray-400 mt-0.5">Photo triage, doctor summaries, care plans.</p>
          </div>
          <ChevronRight size={16} className="text-gray-300" />
        </Link>
      </div>
    </Card>
  );
}

// ── Knowledge Base tab (unchanged from the prior /admin/ai) ─────────────
const DOC_TYPES = ['policy', 'treatment_guide', 'research', 'admin_note'] as const;
const DOC_TYPE_LABELS: Record<string, string> = {
  policy: '📋 Policy', treatment_guide: '🩺 Treatment Guide', research: '🔬 Research', admin_note: '📝 Admin Note',
};
const SOURCE_TYPES = ['service', 'doctor', 'blog', 'location', 'faq', 'result', 'offer', 'document', 'story'];

function KnowledgeBaseTab() {
  const [chunks, setChunks] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const [reindexResult, setReindexResult] = useState('');

  const [documents, setDocuments] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);

  const loadChunks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/knowledge-base/chunks${filter ? `?sourceType=${filter}` : ''}`);
      const data = await res.json();
      if (data.success) { setChunks(data.data); setCounts(data.counts); }
    } finally { setLoading(false); }
  }, [filter]);

  const loadDocuments = useCallback(async () => {
    const res = await fetch('/api/admin/knowledge-documents');
    const data = await res.json();
    if (data.success) setDocuments(data.data);
  }, []);

  useEffect(() => { loadChunks(); }, [loadChunks]);
  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const reindex = async () => {
    setReindexing(true); setReindexResult('');
    try {
      const res = await fetch('/api/admin/knowledge-base/reindex', { method: 'POST' });
      const data = await res.json();
      setReindexResult(data.success ? `Reindexed ${data.upserted}/${data.total} documents${data.failed?.length ? ` (${data.failed.length} failed)` : ''}.` : data.message);
      loadChunks();
    } catch { setReindexResult('Reindex failed.'); }
    finally { setReindexing(false); }
  };

  const openNew = () => { setSelected(null); setIsNew(true); };
  const openEdit = (d: any) => { setSelected(d); setIsNew(false); };
  const close = () => { setSelected(null); setIsNew(false); };

  const onSaved = () => { close(); loadDocuments(); loadChunks(); };
  const onDeleted = () => { close(); loadDocuments(); loadChunks(); };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#0B2560]">Vector Search Index</h2>
            <p className="text-xs text-gray-400 mt-0.5">{chunks.length > 0 ? `${Object.values(counts).reduce((a, b) => a + b, 0)} chunks embedded` : 'Loading…'}</p>
          </div>
          <button onClick={reindex} disabled={reindexing}
            className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-xs font-bold hover:-translate-y-0.5 transition disabled:opacity-50">
            {reindexing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Reindex All
          </button>
        </div>
        {reindexResult && <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">{reindexResult}</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          {SOURCE_TYPES.map(t => (
            <button key={t} onClick={() => setFilter(filter === t ? '' : t)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition capitalize ${
                filter === t ? 'bg-[#0B2560] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {t} ({counts[t] ?? 0})
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#0B2560]">Policies, Guides &amp; Notes</h2>
          <button onClick={openNew} className="flex items-center gap-1.5 text-xs font-bold text-[#0B2560] hover:underline">
            <Plus size={13} /> Add Document
          </button>
        </div>
        <div className="space-y-2">
          {documents.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No documents yet — add policies, treatment guides, research notes, or internal notes for the AI to reference.</p>
          ) : documents.map(d => (
            <button key={d._id} onClick={() => openEdit(d)}
              className="w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition border border-gray-100">
              <div>
                <span className="text-[10px] font-bold text-gray-400">{DOC_TYPE_LABELS[d.docType]}</span>
                <p className="text-sm font-semibold text-[#0B2560]">{d.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${d.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            </button>
          ))}
        </div>
        {(selected || isNew) && (
          <DocumentModal document={isNew ? null : selected} onSaved={onSaved} onDeleted={onDeleted} onClose={close} />
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-[#0B2560] mb-4">Indexed Chunks {filter && `— ${filter}`}</h2>
        {loading ? (
          <p className="text-xs text-gray-400 text-center py-6">Loading…</p>
        ) : chunks.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No chunks found.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {chunks.map((c: any) => (
              <div key={c._id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold uppercase bg-blue-50 text-[#3B82C4] px-1.5 py-0.5 rounded">{c.sourceType}</span>
                  <p className="text-xs font-bold text-[#0B2560] truncate">{c.title}</p>
                </div>
                <p className="text-[11px] text-gray-400 line-clamp-2">{c.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentModal({ document, onSaved, onDeleted, onClose }: { document: any | null; onSaved: () => void; onDeleted: () => void; onClose: () => void }) {
  const isNew = !document?._id;
  const [form, setForm] = useState<any>(document || { title: '', body: '', docType: 'admin_note', tags: [], active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) return setError('Title and body are required');
    setSaving(true); setError('');
    try {
      const url = isNew ? '/api/admin/knowledge-documents' : `/api/admin/knowledge-documents/${document._id}`;
      const res = await fetch(url, { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) onSaved(); else setError(data.message || 'Save failed');
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm(`Delete "${form.title}"?`)) return;
    await fetch(`/api/admin/knowledge-documents/${document._id}`, { method: 'DELETE' });
    onDeleted();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-[#0B2560] text-sm">{isNew ? 'New Document' : 'Edit Document'}</h3>
          <button onClick={onClose}><X size={16} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <select value={form.docType} onChange={e => setForm({ ...form, docType: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
            {DOC_TYPES.map(t => <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>)}
          </select>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Full text — this gets embedded and used to answer patient questions" rows={8}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none" />
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active (included in AI knowledge base)
          </label>
          {form.docType === 'admin_note' && (
            <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">Admin Notes are excluded from patient-facing chat answers even when active — internal-only by design.</p>
          )}
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          {!isNew ? <button onClick={del} className="text-red-500 text-xs font-semibold flex items-center gap-1"><Trash2 size={13} /> Delete</button> : <div />}
          <button onClick={save} disabled={saving} className="bg-[#0B2560] text-white px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50">
            {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Conversations tab (unchanged) ────────────────────────────────────────
function ConversationsTab() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/ai/conversations').then(r => r.json()).then(d => { if (d.success) setConversations(d.data); }).finally(() => setLoading(false));
  }, []);

  const openConversation = async (id: string) => {
    const res = await fetch(`/api/admin/ai/conversations/${id}`);
    const data = await res.json();
    if (data.success) setSelected(data.data);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-[#0B2560]">Conversation History</h2>
        <p className="text-xs text-gray-400 mt-0.5">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
      </div>
      {loading ? (
        <p className="text-xs text-gray-400 text-center py-10">Loading…</p>
      ) : conversations.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-10">No conversations yet.</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {conversations.map(c => (
            <button key={c._id} onClick={() => openConversation(c._id)}
              className="w-full text-left px-5 py-3.5 hover:bg-gray-50 transition flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0B2560] truncate">{c.firstUserMessage || '(no message)'}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{new Date(c.lastMessageAt).toLocaleString()} · {c.messageCount} messages{c.location ? ` · ${c.location}` : ''}</p>
              </div>
              {c.handedOffToWhatsApp && <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-1 rounded-full shrink-0">WhatsApp</span>}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-bold text-[#0B2560] text-sm">Conversation</h3>
              <button onClick={() => setSelected(null)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {selected.messages.map((m: any, i: number) => (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={`max-w-[80%] text-xs px-3.5 py-2 rounded-xl ${m.role === 'user' ? 'bg-[#0B2560] text-white' : 'bg-gray-100 text-gray-700'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Analytics tab (extended with escalations + feedback) ─────────────────
function AnalyticsTab() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/ai/analytics').then(r => r.json()).then(d => { if (d.success) setData(d.data); });
  }, []);

  if (!data) return <p className="text-xs text-gray-400 text-center py-10">Loading…</p>;

  const maxDaily = Math.max(1, ...data.dailyVolume.map((d: any) => d.count));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Conversations', value: data.totalConversations },
          { label: 'Messages', value: data.totalMessages },
          { label: 'Avg / Conversation', value: data.avgMessagesPerConversation },
          { label: 'WhatsApp Handoffs', value: data.whatsappHandoffs },
          { label: 'Escalations', value: data.escalations },
          { label: '👍 / 👎', value: `${data.feedback?.up ?? 0} / ${data.feedback?.down ?? 0}` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-2xl font-bold text-[#0B2560]">{s.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-[#0B2560] mb-4">Message Volume — Last 14 Days</h2>
        {data.dailyVolume.length === 0 ? (
          <p className="text-xs text-gray-400">No activity yet.</p>
        ) : (
          <div className="flex items-end gap-1.5 h-32">
            {data.dailyVolume.map((d: any) => (
              <div key={d._id} className="flex-1 flex flex-col items-center gap-1" title={`${d._id}: ${d.count}`}>
                <div className="w-full bg-[#0B2560] rounded-t" style={{ height: `${Math.max(4, (d.count / maxDaily) * 100)}%` }} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#0B2560] mb-4">Most Recommended</h2>
          {data.cardTypeBreakdown.length === 0 ? (
            <p className="text-xs text-gray-400">No recommendations shown yet.</p>
          ) : data.cardTypeBreakdown.map((c: any) => (
            <div key={c._id} className="flex items-center justify-between py-1.5 text-sm">
              <span className="capitalize text-gray-600">{c._id}</span>
              <span className="font-bold text-[#0B2560]">{c.count}</span>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#0B2560] mb-4">Recent Questions</h2>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {data.recentQuestions.length === 0 ? (
              <p className="text-xs text-gray-400">No questions yet.</p>
            ) : data.recentQuestions.map((q: any, i: number) => (
              <p key={i} className="text-xs text-gray-600 border-b border-gray-50 pb-1.5">{q.question}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Feedback tab ──────────────────────────────────────────────────────────
function FeedbackTab() {
  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    fetch('/api/admin/ai/feedback').then(r => r.json()).then(d => { if (d.success) setRows(d.data); });
  }, []);

  if (!rows) return <p className="text-xs text-gray-400 text-center py-10">Loading…</p>;

  const up = rows.filter(r => r.feedback === 'up').length;
  const down = rows.filter(r => r.feedback === 'down').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
          <ThumbsUp size={18} className="text-green-500" />
          <div><p className="text-2xl font-bold text-[#0B2560]">{up}</p><p className="text-[11px] text-gray-400">Positive</p></div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
          <ThumbsDown size={18} className="text-red-500" />
          <div><p className="text-2xl font-bold text-[#0B2560]">{down}</p><p className="text-[11px] text-gray-400">Negative</p></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-[#0B2560]">Rated Replies</h2>
          <p className="text-xs text-gray-400 mt-0.5">Most recent 100 — negative ratings are the most actionable to review.</p>
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-10">No feedback yet.</p>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[28rem] overflow-y-auto">
            {rows.map((r, i) => (
              <div key={i} className="px-5 py-3.5 flex items-start gap-3">
                {r.feedback === 'up'
                  ? <ThumbsUp size={13} className="text-green-500 shrink-0 mt-0.5" />
                  : <ThumbsDown size={13} className="text-red-500 shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className="text-sm text-gray-700">{r.content}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{new Date(r.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dashboard tab ─────────────────────────────────────────────────────────
function DashboardTab({ form, setTab }: { form: AiSettings; setTab: (t: Tab) => void }) {
  const [analytics, setAnalytics] = useState<any>(null);
  useEffect(() => {
    fetch('/api/admin/ai/analytics').then(r => r.json()).then(d => { if (d.success) setAnalytics(d.data); });
  }, []);

  const shortcuts: { tab: Tab; label: string; icon: any }[] = [
    { tab: 'chatbot', label: 'Chatbot Settings', icon: Bot },
    { tab: 'greetings', label: 'Greetings', icon: MessageSquare },
    { tab: 'recommendations', label: 'Recommendation Rules', icon: Gauge },
    { tab: 'knowledge', label: 'Knowledge Base', icon: Database },
  ];

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl p-5 shadow-sm ${form.enabled ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-200'}`}>
        <p className={`text-sm font-bold ${form.enabled ? 'text-green-700' : 'text-gray-500'}`}>
          {form.enabled ? '● AI Assistant is live' : '○ AI Assistant is disabled'}
        </p>
        <p className="text-xs text-gray-500 mt-1">Model: {form.model} · Theme: {form.theme} · {form.greetingRules.length} greeting rule{form.greetingRules.length !== 1 ? 's' : ''} · {form.recommendationRules.length} recommendation rule{form.recommendationRules.length !== 1 ? 's' : ''} · {form.escalationRules.length} escalation rule{form.escalationRules.length !== 1 ? 's' : ''}</p>
      </div>

      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Conversations', value: analytics.totalConversations },
            { label: 'Messages', value: analytics.totalMessages },
            { label: 'Escalations', value: analytics.escalations },
            { label: '👍 / 👎', value: `${analytics.feedback?.up ?? 0} / ${analytics.feedback?.down ?? 0}` },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <p className="text-2xl font-bold text-[#0B2560]">{s.value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {shortcuts.map(s => (
          <button key={s.tab} onClick={() => setTab(s.tab)}
            className="flex items-center justify-between border border-gray-100 bg-white rounded-xl px-4 py-3.5 hover:border-blue-200 hover:bg-blue-50/40 transition text-left">
            <div className="flex items-center gap-2.5">
              <s.icon size={15} className="text-[#0B2560]" />
              <p className="text-sm font-bold text-[#0B2560]">{s.label}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────
const SETTINGS_TABS = new Set<Tab>(['chatbot', 'greetings', 'questions', 'prompts', 'recommendations', 'actions', 'model']);

export default function AiManagementPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [form, setForm] = useState<AiSettings>(DEFAULTS);
  const [clinicProfile, setClinicProfile] = useState<ClinicProfile>(CLINIC_PROFILE_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/ai/settings')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data?.ai) setForm({ ...DEFAULTS, ...d.data.ai });
        if (d.success && d.data?.clinicProfile) setClinicProfile({ ...CLINIC_PROFILE_DEFAULTS, ...d.data.clinicProfile });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const set = <K extends keyof AiSettings>(key: K, value: AiSettings[K]) => setForm(f => ({ ...f, [key]: value }));
  const setProfile = <K extends keyof ClinicProfile>(key: K, value: ClinicProfile[K]) => setClinicProfile(p => ({ ...p, [key]: value }));

  async function save() {
    setSaving(true); setError(''); setSuccess(false);
    try {
      const res = await fetch('/api/admin/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai: form, clinicProfile }),
      });
      const data = await res.json();
      setSaving(false);
      if (!data.success) { setError(data.message || 'Save failed'); return; }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setSaving(false);
      setError('An unexpected error occurred');
    }
  }

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'chatbot', label: 'Chatbot Settings', icon: Bot },
    { key: 'greetings', label: 'Greetings', icon: MessageSquare },
    { key: 'questions', label: 'Suggested Questions', icon: MessageCircle },
    { key: 'knowledge', label: 'Knowledge Base', icon: Database },
    { key: 'prompts', label: 'Prompt Templates', icon: Sparkles },
    { key: 'recommendations', label: 'Recommendation Rules', icon: Gauge },
    { key: 'actions', label: 'Quick Actions', icon: Compass },
    { key: 'assessment', label: 'Clinical Assessment AI', icon: Stethoscope },
    { key: 'model', label: 'Model & Embeddings', icon: Sliders },
    { key: 'conversations', label: 'Conversation History', icon: MessageSquare },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'feedback', label: 'Feedback', icon: ThumbsUp },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0B2560] flex items-center gap-2"><Bot size={20} /> AI Management</h1>
          <p className="text-gray-400 text-sm mt-0.5">Chatbot config, knowledge base, conversations, analytics, and feedback — nothing here is hardcoded in code.</p>
        </div>
        {SETTINGS_TABS.has(tab) && (
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition disabled:opacity-50 shadow-sm shrink-0">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
        )}
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

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-full overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 ${
              tab === t.key ? 'bg-white text-[#0B2560] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab form={form} setTab={setTab} />}
      {tab === 'chatbot' && <ChatbotSettingsTab form={form} set={set} clinicProfile={clinicProfile} setProfile={setProfile} />}
      {tab === 'greetings' && <GreetingsTab form={form} set={set} />}
      {tab === 'questions' && <SuggestedQuestionsTab form={form} set={set} />}
      {tab === 'knowledge' && <KnowledgeBaseTab />}
      {tab === 'prompts' && <PromptTemplatesTab form={form} set={set} />}
      {tab === 'recommendations' && <RecommendationRulesTab form={form} set={set} />}
      {tab === 'actions' && <QuickActionsTab form={form} set={set} />}
      {tab === 'assessment' && <ClinicalAssessmentTab />}
      {tab === 'model' && <ModelEmbeddingsTab form={form} set={set} />}
      {tab === 'conversations' && <ConversationsTab />}
      {tab === 'analytics' && <AnalyticsTab />}
      {tab === 'feedback' && <FeedbackTab />}
    </div>
  );
}
