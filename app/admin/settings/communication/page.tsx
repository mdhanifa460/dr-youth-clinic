'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Loader2, MessageSquareText, MousePointerClick, Workflow } from 'lucide-react';

const STATUSES = [
  'new_lead', 'requested', 'confirmed', 'reminder_sent', 'checked_in',
  'consultation_started', 'treatment_completed', 'follow_up_scheduled',
  'closed', 'cancelled', 'no_show',
];

const TRIGGERS = [
  { key: 'booking_confirmed', label: 'Booking Confirmed' },
  { key: 'rescheduled', label: 'Rescheduled' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'reminder_24h', label: 'Reminder — 24h before' },
  { key: 'reminder_2h', label: 'Reminder — 2h before' },
  { key: 'treatment_completed', label: 'Treatment Completed' },
  { key: 'review_request', label: 'Review Request' },
];

const ACTIONS = [
  { key: 'link', label: 'Open a link' },
  { key: 'call', label: 'Call a number' },
  { key: 'whatsapp_chat', label: 'Open WhatsApp chat' },
  { key: 'download', label: 'Download a file' },
];

function uid() { return Math.random().toString(36).slice(2, 10); }

export default function CommunicationSettingsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [buttons, setButtons] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then((d) => {
      if (d.success) {
        setTemplates(d.data.communicationTemplates?.items || []);
        setButtons(d.data.whatsappCtaButtons?.buttons || []);
        setRules(d.data.automationRules?.items || []);
      }
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true); setSaved(false);
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        communicationTemplates: { items: templates },
        whatsappCtaButtons: { buttons },
        automationRules: { items: rules },
      }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const addTemplate = () => setTemplates((t) => [...t, { id: uid(), trigger: 'booking_confirmed', channel: 'whatsapp', enabled: true, subject: '', body: '', order: t.length, branch: '' }]);
  const updateTemplate = (i: number, patch: any) => setTemplates((t) => t.map((row, idx) => idx === i ? { ...row, ...patch } : row));
  const removeTemplate = (i: number) => setTemplates((t) => t.filter((_, idx) => idx !== i));

  const addButton = () => setButtons((b) => [...b, { id: uid(), label: '', icon: '💬', action: 'link', url: '', branch: '', language: '', order: b.length, visible: true }]);
  const updateButton = (i: number, patch: any) => setButtons((b) => b.map((row, idx) => idx === i ? { ...row, ...patch } : row));
  const removeButton = (i: number) => setButtons((b) => b.filter((_, idx) => idx !== i));

  const addRule = () => setRules((r) => [...r, { id: uid(), status: 'confirmed', trigger: 'booking_confirmed', enabled: true, branch: '' }]);
  const updateRule = (i: number, patch: any) => setRules((r) => r.map((row, idx) => idx === i ? { ...row, ...patch } : row));
  const removeRule = (i: number) => setRules((r) => r.filter((_, idx) => idx !== i));

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={22} className="animate-spin text-gray-300" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0B2560]">Communication Templates & CTA Buttons</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            The real, editable content behind every automated WhatsApp/email message and CTA button — nothing here is hardcoded in code. Leave Branch blank to apply everywhere, or set it to override just one clinic.
          </p>
        </div>
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* Templates */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#0B2560] flex items-center gap-1.5"><MessageSquareText size={15} /> Communication Templates</h2>
          <button onClick={addTemplate} className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline">
            <Plus size={12} /> Add Template
          </button>
        </div>
        <div className="space-y-3">
          {templates.map((t, i) => (
            <div key={t.id} className={`bg-white rounded-2xl border p-4 space-y-2.5 ${t.enabled ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={t.trigger} onChange={(e) => updateTemplate(i, { trigger: e.target.value })}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-semibold bg-white focus:outline-none">
                  {TRIGGERS.map(tr => <option key={tr.key} value={tr.key}>{tr.label}</option>)}
                </select>
                <select value={t.channel} onChange={(e) => updateTemplate(i, { channel: e.target.value })}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-semibold bg-white focus:outline-none">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
                <input value={t.branch} onChange={(e) => updateTemplate(i, { branch: e.target.value })} placeholder="Branch (blank = all)"
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none w-36" />
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 ml-auto">
                  <input type="checkbox" checked={t.enabled} onChange={(e) => updateTemplate(i, { enabled: e.target.checked })} /> Enabled
                </label>
                <button onClick={() => removeTemplate(i)} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
              </div>
              {t.channel === 'email' && (
                <input value={t.subject} onChange={(e) => updateTemplate(i, { subject: e.target.value })}
                  placeholder="Email subject"
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-[#0B2560]" />
              )}
              <textarea value={t.body} onChange={(e) => updateTemplate(i, { body: e.target.value })} rows={4}
                placeholder="Message body — use {{name}}, {{service}}, {{branch}}, {{date}}, {{time}}, {{doctor}}, {{reason}}, {{followUp}}, {{clinicPhone}}"
                className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-mono focus:outline-none focus:border-[#0B2560] resize-none" />
            </div>
          ))}
          {templates.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No templates yet — click "Add Template" to create one.</p>}
        </div>
      </section>

      {/* CTA buttons */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#0B2560] flex items-center gap-1.5"><MousePointerClick size={15} /> WhatsApp CTA Buttons</h2>
          <button onClick={addButton} className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline">
            <Plus size={12} /> Add Button
          </button>
        </div>
        <div className="space-y-3">
          {buttons.map((b, i) => (
            <div key={b.id} className={`bg-white rounded-2xl border p-4 space-y-2.5 ${b.visible ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input value={b.icon} onChange={(e) => updateButton(i, { icon: e.target.value })} placeholder="🔘"
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none" />
                <input value={b.label} onChange={(e) => updateButton(i, { label: e.target.value })} placeholder="Button label"
                  className="col-span-3 sm:col-span-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                <select value={b.action} onChange={(e) => updateButton(i, { action: e.target.value })}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none">
                  {ACTIONS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
                </select>
                <input value={b.url} onChange={(e) => updateButton(i, { url: e.target.value })}
                  placeholder={b.action === 'call' ? '+91XXXXXXXXXX' : b.action === 'whatsapp_chat' ? 'Leave blank for default number' : 'URL'}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input value={b.branch} onChange={(e) => updateButton(i, { branch: e.target.value })} placeholder="Branch (blank = all)"
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none w-40" />
                <input value={b.language} onChange={(e) => updateButton(i, { language: e.target.value })} placeholder="Language (blank = all)"
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none w-40" />
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 ml-auto">
                  <input type="checkbox" checked={b.visible} onChange={(e) => updateButton(i, { visible: e.target.checked })} /> Visible
                </label>
                <button onClick={() => removeButton(i)} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
          {buttons.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No CTA buttons yet — click "Add Button" to create one.</p>}
        </div>
      </section>

      {/* Automation rules */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#0B2560] flex items-center gap-1.5"><Workflow size={15} /> Automation Rules</h2>
          <button onClick={addRule} className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline">
            <Plus size={12} /> Add Rule
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Which appointment status change fires which communication trigger. A status with no rule here falls back to the platform default. Set a branch to override just that one clinic — a branch-specific rule wins over a blank (all-branches) rule for the same status.
        </p>
        <div className="space-y-2">
          {rules.map((r, i) => (
            <div key={r.id} className={`bg-white rounded-2xl border p-3 flex items-center gap-2 flex-wrap ${r.enabled ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}>
              <span className="text-xs text-gray-400">When status becomes</span>
              <select value={r.status} onChange={(e) => updateRule(i, { status: e.target.value })}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none">
                {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
              <span className="text-xs text-gray-400">send</span>
              <select value={r.trigger} onChange={(e) => updateRule(i, { trigger: e.target.value })}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none">
                {TRIGGERS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              <span className="text-xs text-gray-400">at</span>
              <input value={r.branch} onChange={(e) => updateRule(i, { branch: e.target.value })} placeholder="Branch (blank = all)"
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none w-36" />
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 ml-auto">
                <input type="checkbox" checked={r.enabled} onChange={(e) => updateRule(i, { enabled: e.target.checked })} /> Enabled
              </label>
              <button onClick={() => removeRule(i)} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
            </div>
          ))}
          {rules.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Using platform defaults — click "Add Rule" to override.</p>}
        </div>
      </section>
    </div>
  );
}
