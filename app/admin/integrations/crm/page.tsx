'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plug, RefreshCw, CheckCircle2, XCircle, Loader2, Plus, X, Save } from 'lucide-react';
import { FieldInput } from '@/app/admin/components/FormControls';

interface ConnectorHealth {
  lastCheckAt: string | null;
  lastCheckOk: boolean | null;
  avgResponseMs: number | null;
  lastSyncAt: string | null;
  consecutiveFailures: number;
}

interface ConnectorData {
  _id: string;
  name: string;
  provider: string;
  status: 'active' | 'paused' | 'error' | 'draft';
  config: {
    baseUrl: string;
    timeoutMs: number;
    retryCount: number;
    pullIntervalMin: number;
    endpoints: Record<string, string>;
  };
  health: ConnectorHealth;
}

interface MappingField { platformField: string; externalField: string; transform: string; required: boolean }
interface MappingDoc { capability: string; direction: 'push' | 'pull'; fields: MappingField[] }

const AUTH_TYPES = [
  { value: 'api_key', label: 'API Key' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'oauth2', label: 'OAuth 2.0' },
  { value: 'jwt', label: 'JWT' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'custom_header', label: 'Custom Headers' },
];

const MAPPING_TARGETS: { capability: string; direction: 'push' | 'pull'; label: string }[] = [
  { capability: 'lead', direction: 'push', label: 'Website Lead → CRM' },
  { capability: 'booking', direction: 'push', label: 'Website Booking → CRM' },
  { capability: 'doctor', direction: 'pull', label: 'CRM Doctors → Website' },
  { capability: 'branch', direction: 'pull', label: 'CRM Branches → Website' },
];

const OPERATIONS = ['healthCheck', 'getDoctors', 'getBranches', 'pushWebsiteLead', 'pushWebsiteBooking'];

const STATUS_META: Record<string, { label: string; cls: string; icon: any }> = {
  active: { label: 'Active', cls: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle2 },
  paused: { label: 'Paused', cls: 'text-gray-500 bg-gray-50 border-gray-200', icon: XCircle },
  error: { label: 'Error', cls: 'text-red-600 bg-red-50 border-red-200', icon: XCircle },
  draft: { label: 'Draft — not configured', cls: 'text-amber-600 bg-amber-50 border-amber-200', icon: XCircle },
};

export default function CrmSyncPage() {
  const [connector, setConnector] = useState<ConnectorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string; latencyMs?: number } | null>(null);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const [authType, setAuthType] = useState('api_key');
  const [authFields, setAuthFields] = useState<Record<string, string>>({});
  const [authInfo, setAuthInfo] = useState<{ authType?: string; last4?: string } | null>(null);
  const [savingAuth, setSavingAuth] = useState(false);

  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookInfo, setWebhookInfo] = useState<{ last4: string; webhookUrl: string } | null>(null);
  const [savingWebhook, setSavingWebhook] = useState(false);

  const [mappingTarget, setMappingTarget] = useState(MAPPING_TARGETS[0]);
  const [mappingFields, setMappingFields] = useState<MappingField[]>([]);
  const [savingMapping, setSavingMapping] = useState(false);

  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [connRes, authRes, webhookRes] = await Promise.all([
      fetch('/api/admin/integrations/crm').then((r) => r.json()),
      fetch('/api/admin/integrations/crm/credentials').then((r) => r.json()),
      fetch('/api/admin/integrations/crm/webhook-secret').then((r) => r.json()),
    ]);
    if (connRes.success) setConnector(connRes.data);
    if (authRes.success && authRes.data) {
      setAuthInfo(authRes.data);
      setAuthType(authRes.data.authType || 'api_key');
    }
    if (webhookRes.success && webhookRes.data) setWebhookInfo(webhookRes.data);
    setLoading(false);
  }, []);

  const loadMapping = useCallback(async (target: typeof mappingTarget) => {
    const res = await fetch('/api/admin/integrations/crm/mapping').then((r) => r.json());
    if (res.success) {
      const match = (res.data as MappingDoc[]).find(
        (m) => m.capability === target.capability && m.direction === target.direction
      );
      setMappingFields(match?.fields || []);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    const res = await fetch('/api/admin/integrations/crm/logs?limit=20').then((r) => r.json());
    if (res.success) setLogs(res.data);
    setLogsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadMapping(mappingTarget); }, [mappingTarget, loadMapping]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  const saveConfig = async () => {
    if (!connector) return;
    setSaving(true);
    const res = await fetch('/api/admin/integrations/crm', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: connector.name, provider: connector.provider, status: connector.status, config: connector.config }),
    }).then((r) => r.json());
    if (res.success) setConnector(res.data);
    setSaving(false);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await fetch('/api/admin/integrations/crm/test', { method: 'POST' }).then((r) => r.json());
    setTestResult(res.success ? { ok: res.ok, message: res.message, latencyMs: res.latencyMs } : { ok: false, message: res.message });
    setTesting(false);
    load();
    loadLogs();
  };

  const syncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    const res = await fetch('/api/admin/integrations/crm/sync', { method: 'POST' }).then((r) => r.json());
    setSyncResult(res);
    setSyncing(false);
    load();
    loadLogs();
  };

  const saveAuth = async () => {
    setSavingAuth(true);
    const res = await fetch('/api/admin/integrations/crm/credentials', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authType, ...authFields }),
    }).then((r) => r.json());
    setSavingAuth(false);
    if (res.success) {
      setAuthFields({});
      load();
    }
  };

  const saveWebhookSecret = async () => {
    if (!webhookSecret) return;
    setSavingWebhook(true);
    const res = await fetch('/api/admin/integrations/crm/webhook-secret', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: webhookSecret }),
    }).then((r) => r.json());
    setSavingWebhook(false);
    if (res.success) {
      setWebhookSecret('');
      setWebhookInfo({ last4: webhookSecret.slice(-4), webhookUrl: res.webhookUrl });
    }
  };

  const saveMapping = async () => {
    setSavingMapping(true);
    await fetch('/api/admin/integrations/crm/mapping', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capability: mappingTarget.capability, direction: mappingTarget.direction, fields: mappingFields }),
    });
    setSavingMapping(false);
  };

  if (loading || !connector) {
    return <div className="p-8 flex items-center gap-2 text-gray-400"><Loader2 className="animate-spin" size={16} /> Loading…</div>;
  }

  const meta = STATUS_META[connector.status];
  const StatusIcon = meta.icon;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Plug size={22} /> CRM Sync</h1>
          <p className="text-sm text-gray-500 mt-0.5">One connector, source of truth for doctors, branches, and where website leads/bookings get pushed.</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${meta.cls}`}>
          <StatusIcon size={13} /> {meta.label}
        </span>
      </div>

      {/* Actions + health */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex flex-wrap gap-3">
          <button onClick={testConnection} disabled={testing}
            className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d2d72] disabled:opacity-50">
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />} Test Connection
          </button>
          <button onClick={syncNow} disabled={syncing}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sync Now (doctors + branches)
          </button>
        </div>
        {testResult && (
          <div className={`text-sm px-3 py-2 rounded-lg ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {testResult.ok ? `✓ Connected (${testResult.latencyMs}ms)` : `✗ ${testResult.message}`}
          </div>
        )}
        {syncResult && (
          <div className={`text-sm px-3 py-2 rounded-lg ${syncResult.success ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
            {syncResult.success
              ? `Synced ${syncResult.itemsSynced}/${syncResult.itemsTotal} · ${syncResult.itemsUnmatched} unmatched · ${syncResult.itemsFailed} failed`
              : `✗ ${syncResult.message}`}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div><p className="text-gray-400">Last check</p><p className="font-semibold text-gray-700">{fmt(connector.health.lastCheckAt)}</p></div>
          <div><p className="text-gray-400">Avg response</p><p className="font-semibold text-gray-700">{connector.health.avgResponseMs ? `${connector.health.avgResponseMs}ms` : '—'}</p></div>
          <div><p className="text-gray-400">Last sync</p><p className="font-semibold text-gray-700">{fmt(connector.health.lastSyncAt)}</p></div>
          <div><p className="text-gray-400">Consecutive failures</p><p className="font-semibold text-gray-700">{connector.health.consecutiveFailures}</p></div>
        </div>
      </div>

      {/* Config */}
      <Section title="Config">
        <div className="grid sm:grid-cols-2 gap-3">
          <FieldInput label="Name" value={connector.name} onChange={(v) => setConnector({ ...connector, name: v })} />
          <FieldInput label="Provider (free text)" value={connector.provider} onChange={(v) => setConnector({ ...connector, provider: v })} placeholder="e.g. leadsquared" />
        </div>
        <FieldInput label="Base URL" value={connector.config.baseUrl} onChange={(v) => setConnector({ ...connector, config: { ...connector.config, baseUrl: v } })} placeholder="https://api.yourcrm.com" />
        <div className="grid sm:grid-cols-3 gap-3">
          <FieldInput label="Timeout (ms)" type="number" value={connector.config.timeoutMs} onChange={(v) => setConnector({ ...connector, config: { ...connector.config, timeoutMs: Number(v) } })} />
          <FieldInput label="Retry Count" type="number" value={connector.config.retryCount} onChange={(v) => setConnector({ ...connector, config: { ...connector.config, retryCount: Number(v) } })} />
          <FieldInput label="Pull Interval (min)" type="number" value={connector.config.pullIntervalMin} onChange={(v) => setConnector({ ...connector, config: { ...connector.config, pullIntervalMin: Number(v) } })} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Status</label>
          <select value={connector.status} onChange={(e) => setConnector({ ...connector, status: e.target.value as any })}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Endpoints (per-operation URL path)</label>
          <div className="space-y-2">
            {OPERATIONS.map((op) => (
              <div key={op} className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500 w-40 shrink-0">{op}</span>
                <input value={connector.config.endpoints?.[op] || ''}
                  onChange={(e) => setConnector({ ...connector, config: { ...connector.config, endpoints: { ...connector.config.endpoints, [op]: e.target.value } } })}
                  placeholder="/api/v2/..."
                  className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
              </div>
            ))}
          </div>
        </div>
        <button onClick={saveConfig} disabled={saving}
          className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d2d72] disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Config
        </button>
      </Section>

      {/* Auth */}
      <Section title="Authentication" subtitle={authInfo?.last4 ? `Saved — ${authInfo.authType}, ending •••${authInfo.last4}` : 'Not configured yet'}>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Auth Type</label>
          <select value={authType} onChange={(e) => { setAuthType(e.target.value); setAuthFields({}); }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
            {AUTH_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <AuthFieldsEditor authType={authType} values={authFields} onChange={setAuthFields} />
        <button onClick={saveAuth} disabled={savingAuth}
          className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d2d72] disabled:opacity-50">
          {savingAuth ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Credentials
        </button>
      </Section>

      {/* Webhook */}
      <Section title="Webhook" subtitle={webhookInfo ? `Endpoint: ${webhookInfo.webhookUrl}` : 'Not configured yet'}>
        <FieldInput label="Signing Secret (from your CRM's webhook settings)" value={webhookSecret} onChange={setWebhookSecret} placeholder={webhookInfo?.last4 ? `•••${webhookInfo.last4} — paste a new one to replace` : 'paste secret'} />
        <button onClick={saveWebhookSecret} disabled={savingWebhook || !webhookSecret}
          className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d2d72] disabled:opacity-50 disabled:cursor-not-allowed">
          {savingWebhook ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Webhook Secret
        </button>
      </Section>

      {/* Field Mapping */}
      <Section title="Field Mapping">
        <div className="flex flex-wrap gap-2">
          {MAPPING_TARGETS.map((t) => (
            <button key={`${t.capability}-${t.direction}`} onClick={() => setMappingTarget(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${mappingTarget.capability === t.capability && mappingTarget.direction === t.direction ? 'bg-[#0B2560] text-white border-[#0B2560]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <MappingEditor fields={mappingFields} onChange={setMappingFields} direction={mappingTarget.direction} />
        <button onClick={saveMapping} disabled={savingMapping}
          className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d2d72] disabled:opacity-50">
          {savingMapping ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Mapping
        </button>
      </Section>

      {/* Logs */}
      <Section title="Recent Activity">
        {logsLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-400">No activity yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="text-left text-gray-400 uppercase tracking-wide">
                <tr><th className="py-2 pr-4">When</th><th className="py-2 pr-4">Direction</th><th className="py-2 pr-4">Operation</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Latency</th><th className="py-2">Error</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">{fmt(log.createdAt)}</td>
                    <td className="py-2 pr-4">{log.direction}</td>
                    <td className="py-2 pr-4 font-mono">{log.operation}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${log.status === 'success' ? 'bg-green-50 text-green-700' : log.status === 'dead' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{log.status}</span>
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{log.latencyMs ? `${log.latencyMs}ms` : '—'}</td>
                    <td className="py-2 text-red-500">{log.errorMessage || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function AuthFieldsEditor({ authType, values, onChange }: { authType: string; values: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const set = (k: string, v: string) => onChange({ ...values, [k]: v });
  switch (authType) {
    case 'api_key':
      return <FieldInput label="API Key" value={values.key || ''} onChange={(v) => set('key', v)} />;
    case 'bearer':
    case 'jwt':
      return <FieldInput label="Token" value={values.token || ''} onChange={(v) => set('token', v)} />;
    case 'oauth2':
      return (
        <div className="grid sm:grid-cols-2 gap-3">
          <FieldInput label="Client ID" value={values.clientId || ''} onChange={(v) => set('clientId', v)} />
          <FieldInput label="Client Secret" value={values.clientSecret || ''} onChange={(v) => set('clientSecret', v)} />
          <FieldInput label="Refresh Token" value={values.refreshToken || ''} onChange={(v) => set('refreshToken', v)} />
          <FieldInput label="Access Token (temporary, until refresh is wired)" value={values.accessToken || ''} onChange={(v) => set('accessToken', v)} />
        </div>
      );
    case 'basic':
      return (
        <div className="grid sm:grid-cols-2 gap-3">
          <FieldInput label="Username" value={values.username || ''} onChange={(v) => set('username', v)} />
          <FieldInput label="Password" value={values.password || ''} onChange={(v) => set('password', v)} />
        </div>
      );
    case 'custom_header':
      return <FieldInput label="Headers (JSON)" type="textarea" value={values.headersJson || ''} onChange={(v) => set('headersJson', v)} placeholder='{"X-Custom": "value"}' />;
    default:
      return null;
  }
}

function MappingEditor({ fields, onChange, direction }: { fields: MappingField[]; onChange: (f: MappingField[]) => void; direction: 'push' | 'pull' }) {
  const add = () => onChange([...fields, { platformField: '', externalField: '', transform: '', required: false }]);
  const update = (i: number, patch: Partial<MappingField>) => {
    const next = [...fields];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => onChange(fields.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Platform field {direction === 'push' ? '→' : '←'} CRM field
        </label>
        <button onClick={add} className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline">
          <Plus size={10} /> Add Field
        </button>
      </div>
      <div className="space-y-2">
        {fields.map((f, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-xl p-2.5">
            <input value={f.platformField} onChange={(e) => update(i, { platformField: e.target.value })} placeholder="platformField"
              className="flex-1 min-w-[100px] border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono" />
            <span className="text-gray-300 text-xs">{direction === 'push' ? '→' : '←'}</span>
            <input value={f.externalField} onChange={(e) => update(i, { externalField: e.target.value })} placeholder="External_Field"
              className="flex-1 min-w-[100px] border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono" />
            <input value={f.transform} onChange={(e) => update(i, { transform: e.target.value })} placeholder="transform (optional)"
              className="w-36 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono" />
            <label className="flex items-center gap-1 text-[10px] text-gray-500 shrink-0">
              <input type="checkbox" checked={f.required} onChange={(e) => update(i, { required: e.target.checked })} /> required
            </label>
            <button onClick={() => remove(i)} className="text-gray-300 hover:text-red-500 shrink-0"><X size={13} /></button>
          </div>
        ))}
        {fields.length === 0 && <p className="text-xs text-gray-400">No fields mapped yet.</p>}
      </div>
    </div>
  );
}

function fmt(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
