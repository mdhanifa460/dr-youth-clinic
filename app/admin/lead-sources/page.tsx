'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, X, Save, Loader2, Radio, Link2, Copy, Check } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Connector {
  _id: string;
  name: string;
  provider: string;
  status: 'active' | 'paused' | 'error' | 'draft';
  webhookSecret?: { last4?: string };
}

interface MappingField {
  platformField: string;
  externalField: string;
  transform: string;
  required: boolean;
  staticValue: string;
}

interface SourceMapping {
  _id: string;
  label: string;
  source: string;
  branch: string;
  providerAccountId: string;
  providerPhone: string;
  whatsappPhoneNumberId: string;
  active: boolean;
}

// The platform-side fields a connector's Field Mapping can populate —
// shown as suggestions in the dropdown, not a hard constraint (a provider
// might send extra fields an admin wants captured via a custom name too).
const PLATFORM_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone (required)' },
  { key: 'email', label: 'Email' },
  { key: 'service', label: 'Service / Enquiry' },
  { key: 'notes', label: 'Notes' },
  { key: 'externalId', label: 'Their lead/enquiry ID (for update-in-place)' },
  { key: 'providerAccountId', label: 'Provider account / listing ID (for branch routing)' },
  { key: 'providerPhone', label: 'Provider-side phone (for branch routing)' },
];

const BRANCHES = ['chennai', 'bangalore', 'coimbatore', 'kochi'];
const COMMON_SOURCES = ['justdial', 'indiamart', 'whatsapp', 'website', 'google', 'facebook', 'referral', 'phone'];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function LeadSourcesPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [mappings, setMappings] = useState<SourceMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedConnector, setExpandedConnector] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/admin/lead-source-connectors').then((r) => r.json()),
      fetch('/api/admin/lead-source-mappings').then((r) => r.json()),
    ])
      .then(([c, m]) => {
        if (c.success) setConnectors(c.data);
        if (m.success) setMappings(m.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const addConnector = async () => {
    const provider = prompt('Provider key (e.g. justdial, indiamart, whatsapp):');
    if (!provider) return;
    const name = prompt('Display name (e.g. "JustDial — all branches"):', provider) || provider;
    const res = await fetch('/api/admin/lead-source-connectors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, provider }),
    }).then((r) => r.json());
    if (res.success) load();
    else alert(res.message);
  };

  const removeConnector = async (id: string) => {
    if (!confirm('Delete this connector? Its field mapping and webhook secret go with it — leads already created stay untouched.')) return;
    await fetch(`/api/admin/lead-source-connectors/${id}`, { method: 'DELETE' });
    load();
  };

  const addMapping = async () => {
    const label = prompt('Label (e.g. "JustDial Listing A — Chennai"):');
    if (!label) return;
    const source = prompt('Source (e.g. justdial, indiamart, whatsapp):');
    if (!source) return;
    const branch = prompt(`Branch (${BRANCHES.join(' / ')}):`);
    if (!branch) return;
    const providerAccountId = prompt('Provider account / listing / campaign ID (leave blank if none):') || '';
    const providerPhone = source === 'whatsapp' ? '' : (prompt('Provider-side phone number (leave blank if none):') || '');
    const whatsappPhoneNumberId = source === 'whatsapp' ? (prompt('WhatsApp phone_number_id (from Meta):') || '') : '';

    const res = await fetch('/api/admin/lead-source-mappings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, source, branch, providerAccountId, providerPhone, whatsappPhoneNumberId }),
    }).then((r) => r.json());
    if (res.success) load();
    else alert(res.message);
  };

  const toggleMappingActive = async (m: SourceMapping) => {
    await fetch(`/api/admin/lead-source-mappings/${m._id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !m.active }),
    });
    load();
  };

  const removeMapping = async (id: string) => {
    if (!confirm('Delete this branch mapping? Leads matching it will stop routing to a branch automatically.')) return;
    await fetch(`/api/admin/lead-source-mappings/${id}`, { method: 'DELETE' });
    load();
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading Lead Sources…</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Radio size={22} /> Lead Sources &amp; Branch Routing</h1>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          One generic bridge for every third-party lead channel — JustDial, IndiaMART, WhatsApp, or anything
          added later. A new provider is a Connector below plus a few Branch Mapping rows — never new code.
        </p>
      </div>

      {/* ── Connectors ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Connectors</h2>
          <button onClick={addConnector} className="flex items-center gap-1.5 text-xs font-bold text-[#0B2560] hover:underline">
            <Plus size={12} /> New Connector
          </button>
        </div>
        {connectors.length === 0 && (
          <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            No lead-source connectors yet. Click "New Connector" to add JustDial, IndiaMART, or any other provider.
          </div>
        )}
        {connectors.map((c) => (
          <ConnectorCard
            key={c._id}
            connector={c}
            expanded={expandedConnector === c._id}
            onToggle={() => setExpandedConnector(expandedConnector === c._id ? null : c._id)}
            onRemove={() => removeConnector(c._id)}
            onChanged={load}
          />
        ))}
      </section>

      {/* ── Branch Mapping table ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Branch Mapping</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Which exact listing/account/phone number belongs to which branch. A lead with no matching row here
              is still saved — just flagged for a staff member to assign the branch manually, never guessed.
            </p>
          </div>
          <button onClick={addMapping} className="flex items-center gap-1.5 text-xs font-bold text-[#0B2560] hover:underline shrink-0">
            <Plus size={12} /> New Mapping
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5">Label</th>
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5">Identifier</th>
                <th className="px-4 py-2.5">Branch</th>
                <th className="px-4 py-2.5">Active</th>
                <th className="px-4 py-2.5 text-right">—</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mappings.map((m) => (
                <tr key={m._id} className={!m.active ? 'opacity-50' : ''}>
                  <td className="px-4 py-2.5 font-semibold text-gray-800">{m.label}</td>
                  <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{m.source}</td>
                  <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">
                    {m.whatsappPhoneNumberId || m.providerAccountId || m.providerPhone || '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 capitalize">{m.branch}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => toggleMappingActive(m)} className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {m.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => removeMapping(m._id)} className="text-gray-300 hover:text-red-500"><X size={14} /></button>
                  </td>
                </tr>
              ))}
              {mappings.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No branch mappings yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ─── Connector card (webhook URL/secret + field mapping) ───────────────────

function ConnectorCard({
  connector, expanded, onToggle, onRemove, onChanged,
}: {
  connector: Connector; expanded: boolean; onToggle: () => void; onRemove: () => void; onChanged: () => void;
}) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [savingSecret, setSavingSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fields, setFields] = useState<MappingField[]>([]);
  const [savingFields, setSavingFields] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    fetch(`/api/admin/lead-source-connectors/${connector._id}/webhook-secret`).then((r) => r.json()).then((d) => {
      if (d.success) setWebhookUrl(d.data.webhookUrl);
    });
    fetch(`/api/admin/lead-source-connectors/${connector._id}/mapping`).then((r) => r.json()).then((d) => {
      if (d.success) setFields(d.data);
    });
  }, [expanded, connector._id]);

  const saveSecret = async () => {
    if (!secretInput) return;
    setSavingSecret(true);
    await fetch(`/api/admin/lead-source-connectors/${connector._id}/webhook-secret`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: secretInput }),
    });
    setSecretInput('');
    setSavingSecret(false);
    onChanged();
  };

  const addField = () => setFields((f) => [...f, { platformField: 'phone', externalField: '', transform: '', required: true, staticValue: '' }]);
  const updateField = (i: number, patch: Partial<MappingField>) => setFields((f) => f.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const removeField = (i: number) => setFields((f) => f.filter((_, idx) => idx !== i));

  const saveFields = async () => {
    setSavingFields(true);
    await fetch(`/api/admin/lead-source-connectors/${connector._id}/mapping`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }),
    });
    setSavingFields(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 cursor-pointer" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">{connector.name}</p>
          <p className="text-xs text-gray-400 font-mono">{connector.provider}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${connector.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {connector.status}
        </span>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-gray-300 hover:text-red-500"><X size={16} /></button>
        <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-5">
          {/* Webhook URL + secret */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><Link2 size={12} /> Webhook URL — give this to {connector.provider}</p>
            {webhookUrl && (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 truncate">{typeof window !== 'undefined' ? window.location.origin : ''}{webhookUrl}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${webhookUrl}`); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                  className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-[#0B2560]"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            )}
            <p className="text-xs font-bold text-gray-500 mt-3">Signing secret {connector.webhookSecret?.last4 && <span className="font-normal text-gray-400">(currently ending in …{connector.webhookSecret.last4})</span>}</p>
            <div className="flex items-center gap-2">
              <input
                type="password" value={secretInput} onChange={(e) => setSecretInput(e.target.value)}
                placeholder="Paste the secret this provider signs requests with"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs"
              />
              <button onClick={saveSecret} disabled={savingSecret || !secretInput} className="px-3 py-2 bg-[#0B2560] text-white rounded-lg text-xs font-semibold disabled:opacity-40">
                {savingSecret ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>

          {/* Field mapping */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-500">Field Mapping — translate {connector.provider}'s payload into ours</p>
              <button onClick={saveFields} disabled={savingFields} className="flex items-center gap-1 text-xs font-bold text-[#0B2560] hover:underline">
                {savingFields ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save Mapping
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                  <select value={f.platformField} onChange={(e) => updateField(i, { platformField: e.target.value })} className="col-span-4 border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
                    {PLATFORM_FIELDS.map((pf) => <option key={pf.key} value={pf.key}>{pf.label}</option>)}
                  </select>
                  <span className="col-span-1 text-center text-gray-300 text-xs">←</span>
                  <input
                    value={f.externalField} onChange={(e) => updateField(i, { externalField: e.target.value })}
                    placeholder={`their JSON field name, e.g. "customer_mobile"`}
                    className="col-span-5 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono"
                  />
                  <label className="col-span-1 flex items-center gap-1 text-[10px] text-gray-400">
                    <input type="checkbox" checked={f.required} onChange={(e) => updateField(i, { required: e.target.checked })} /> req
                  </label>
                  <button onClick={() => removeField(i)} className="col-span-1 text-gray-300 hover:text-red-500 justify-self-end"><X size={13} /></button>
                </div>
              ))}
            </div>
            <button onClick={addField} className="mt-2 text-xs font-bold text-[#0B2560] hover:underline flex items-center gap-1"><Plus size={11} /> Add field</button>
            <p className="text-[10px] text-gray-400 mt-2">
              "their JSON field name" is whatever key {connector.provider}'s webhook payload actually uses for
              that value — check their docs/a sample payload. Map "Provider account / listing ID" and/or
              "Provider-side phone" so Branch Mapping below can route this lead to the right clinic.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
