"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Loader2, CheckCircle, AlertCircle, Save, Bot, Sparkles,
  MessageSquare, Sliders, Plus, Trash2, Palette,
} from "lucide-react";

type QuickAction = { label: string; action: string };

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
  quickActions: QuickAction[];
  enableRecommendations: boolean;
  enableBooking: boolean;
  enableWhatsappHandoff: boolean;
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
  quickActions: [
    { label: '📅 Book Appointment', action: '/book' },
    { label: '🧪 Take Skin Quiz', action: '/skin-quiz' },
    { label: '🏷️ View Offers', action: '/offers' },
  ],
  enableRecommendations: true,
  enableBooking: true,
  enableWhatsappHandoff: true,
};

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

export default function AiSettingsPage() {
  const [form, setForm] = useState<AiSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.ai) setForm({ ...DEFAULTS, ...d.data.ai });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const set = <K extends keyof AiSettings>(key: K, value: AiSettings[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    setSaving(true); setError(""); setSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai: form }),
      });
      const data = await res.json();
      setSaving(false);
      if (!data.success) { setError(data.message || "Save failed"); return; }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setSaving(false);
      setError("An unexpected error occurred");
    }
  }

  const setQuestion = (i: number, val: string) => {
    const next = [...form.suggestedQuestions]; next[i] = val; set('suggestedQuestions', next);
  };
  const addQuestion = () => set('suggestedQuestions', [...form.suggestedQuestions, '']);
  const removeQuestion = (i: number) => set('suggestedQuestions', form.suggestedQuestions.filter((_, idx) => idx !== i));

  const setAction = (i: number, key: keyof QuickAction, val: string) => {
    const next = [...form.quickActions]; next[i] = { ...next[i], [key]: val }; set('quickActions', next);
  };
  const addAction = () => set('quickActions', [...form.quickActions, { label: '', action: '' }]);
  const removeAction = (i: number) => set('quickActions', form.quickActions.filter((_, idx) => idx !== i));

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
            <h1 className="text-2xl font-bold text-[#0B2560] flex items-center gap-2"><Bot size={22} /> AI Assistant</h1>
            <p className="text-gray-400 text-sm mt-0.5">Configure the site-wide AI chat assistant — nothing here is hardcoded in code.</p>
          </div>
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition disabled:opacity-50 shadow-sm shrink-0">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
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

        {/* Enable / Disable */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 shadow-sm">
          <Toggle checked={form.enabled} onChange={() => set('enabled', !form.enabled)}
            label="Enable AI Assistant" sub="Turns the floating chat widget on/off across the entire public site." />
        </div>

        {/* Greeting & Welcome */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 shadow-sm space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><MessageSquare size={13} /> Greeting</p>
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
        </div>

        {/* Prompts */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 shadow-sm space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Sparkles size={13} /> Prompt Templates</p>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Chat Assistant Persona / System Prompt</label>
            <textarea value={form.systemPrompt} onChange={e => set('systemPrompt', e.target.value)} rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 resize-none" />
            <p className="text-[11px] text-gray-400 mt-1">Always combined with fixed clinical safety guardrails (never diagnose, never prescribe) — those can't be edited away from here.</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Recommendation Prompt</label>
            <textarea value={form.recommendationPrompt} onChange={e => set('recommendationPrompt', e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 resize-none" />
          </div>
        </div>

        {/* LLM / Embedding config */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 shadow-sm space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Sliders size={13} /> LLM &amp; Embedding Configuration</p>
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
        </div>

        {/* Theme */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 shadow-sm space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Palette size={13} /> Theme</p>
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
        </div>

        {/* Suggested Questions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Suggested Questions</p>
            <button onClick={addQuestion} className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline"><Plus size={12} /> Add</button>
          </div>
          <div className="space-y-2">
            {form.suggestedQuestions.map((q, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={q} onChange={e => setQuestion(i, e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
                <button onClick={() => removeQuestion(i)} className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quick Actions</p>
            <button onClick={addAction} className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline"><Plus size={12} /> Add</button>
          </div>
          <div className="space-y-2">
            {form.quickActions.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={a.label} onChange={e => setAction(i, 'label', e.target.value)} placeholder="Label"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
                <input value={a.action} onChange={e => setAction(i, 'action', e.target.value)} placeholder="/path"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
                <button onClick={() => removeAction(i)} className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Feature toggles */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 shadow-sm space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Features</p>
          <Toggle checked={form.enableRecommendations} onChange={() => set('enableRecommendations', !form.enableRecommendations)}
            label="Recommendations" sub="Doctor / service / offer / result cards suggested in chat." />
          <Toggle checked={form.enableBooking} onChange={() => set('enableBooking', !form.enableBooking)}
            label="Booking CTA" sub="Show a Book Appointment button in chat responses." />
          <Toggle checked={form.enableWhatsappHandoff} onChange={() => set('enableWhatsappHandoff', !form.enableWhatsappHandoff)}
            label="WhatsApp Handoff" sub="Offer to continue the conversation on WhatsApp." />
        </div>

        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 text-blue-700 text-sm px-4 py-3.5 rounded-xl">
          <AlertCircle size={15} className="shrink-0 mt-0.5 text-blue-400" />
          <p>FAQs shown to the assistant are managed at <Link href="/admin/homepage" className="underline font-semibold">Homepage → FAQ Accordion</Link> — no separate FAQ list here, so there's one source of truth.</p>
        </div>

      </div>
    </div>
  );
}
