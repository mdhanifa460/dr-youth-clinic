'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Plug, RefreshCw, CheckCircle2, XCircle, Loader2, Plus, X, Save, Copy, Check, ArrowDownToLine, ArrowUpFromLine, Clock, Sparkles } from 'lucide-react';
import { FieldInput } from '@/app/admin/components/FormControls';
import GuidedTour, { type TourStep, type GuidedTourHandle } from '@/app/admin/components/GuidedTour';

const CRM_SYNC_TOUR_STEPS: TourStep[] = [
  {
    target: 'connection-baseurl',
    title: "Your CRM's address",
    description: "This is the web address your CRM's API lives at — ask your CRM developer for this if you don't have it handy.",
    example: 'https://api.yourcrm.com',
  },
  {
    target: 'connection-auth',
    title: 'How we prove who we are',
    description: "Pick whatever your CRM already supports. Most systems use an API Key or Bearer Token — if you're not sure, ask your CRM developer which one they use.",
    example: 'API Key is the simplest — just one secret value.',
  },
  {
    target: 'push-endpoints',
    title: 'Where enquiries/bookings go',
    description: 'Give these two paths to your CRM developer — this is where we automatically send every website enquiry and booking, the moment it happens. Nothing for you to trigger manually.',
    example: '/api/v2/leads',
  },
  {
    target: 'pull-endpoints',
    title: 'Optional: doctor & branch sync',
    description: 'Only fill these in if you want the website\'s doctor list and location pages to update automatically from your CRM. Skip this entirely and manage doctors/branches by hand — nothing else breaks.',
    example: '/api/v2/doctors',
  },
  {
    target: 'webhook-url',
    title: 'Give this URL to your CRM developer',
    description: 'This is the one URL your CRM should call the instant a lead or invoice is created or updated. Copy it and send it over — this is the most important thing on this whole page.',
  },
  {
    target: 'webhook-secret',
    title: 'A shared password for that URL',
    description: "Your CRM developer generates this on their end and gives it to you — it proves a request calling our URL really came from your CRM, not somewhere else.",
  },
  {
    target: 'mapping-tabs',
    title: 'Matching field names',
    description: "Your CRM might call a field \"billNo\" while we call it \"invoiceNumber\" — pick which of these 6 things you're configuring, then tell us which of your CRM's field names line up with ours.",
  },
  {
    target: 'mapping-static',
    title: 'Fixed values',
    description: 'Click "Add Field" to add a row for each field you want to map. Tick "fixed value" on a row when it should always be the same thing, not read from a real record every time.',
    example: 'source = website, always the same, never something the CRM sends us.',
  },
  {
    target: 'save-mapping',
    title: "Don't forget to save",
    description: 'Each mapping (Leads, Bookings, Doctors, Branches, etc.) has to be saved separately after you edit it — switching tabs without saving loses your changes for that one.',
  },
];

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

interface MappingField { platformField: string; externalField: string; transform: string; required: boolean; staticValue: string }
interface MappingDoc { capability: string; direction: 'push' | 'pull'; fields: MappingField[] }

const AUTH_TYPES = [
  { value: 'api_key', label: 'API Key' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'oauth2', label: 'OAuth 2.0' },
  { value: 'jwt', label: 'JWT' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'custom_header', label: 'Custom Headers' },
];

// Only doctor/branch pull need an endpoint path (they're polled via GET).
// Leads and invoices arrive over the webhook instead — no endpoint to
// configure for those.
const PULL_OPERATIONS = ['healthCheck', 'getDoctors', 'getBranches'];
const PUSH_OPERATIONS = ['pushWebsiteLead', 'pushWebsiteBooking'];

const MAPPING_TARGETS: { capability: string; direction: 'push' | 'pull'; label: string; blurb: string }[] = [
  { capability: 'lead', direction: 'push', label: 'Website enquiry → your CRM', blurb: 'When someone submits an enquiry form on the website, these fields are sent to your CRM.' },
  { capability: 'booking', direction: 'push', label: 'Website booking → your CRM', blurb: 'When someone books a slot on the website, these fields are sent to your CRM (includes date/time).' },
  { capability: 'doctor', direction: 'pull', label: 'Your CRM’s doctors → website', blurb: 'We check your CRM periodically and update the doctor list shown on the website from these fields.' },
  { capability: 'branch', direction: 'pull', label: 'Your CRM’s branches → website', blurb: 'We check your CRM periodically and update the branch/location pages from these fields.' },
  { capability: 'lead', direction: 'pull', label: 'Your CRM’s leads → this admin panel', blurb: 'When your team logs a phone/walk-in enquiry in the CRM, it sends us these fields the moment it happens.' },
  { capability: 'invoice', direction: 'pull', label: 'Your CRM’s invoices → this admin panel', blurb: 'When a bill is created or updated in your CRM, it sends us these fields — patient, doctor, treatment, and amount together.' },
];

const STATUS_META: Record<string, { label: string; cls: string; icon: any }> = {
  active: { label: 'Active', cls: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle2 },
  paused: { label: 'Paused', cls: 'text-gray-500 bg-gray-50 border-gray-200', icon: XCircle },
  error: { label: 'Error', cls: 'text-red-600 bg-red-50 border-red-200', icon: XCircle },
  draft: { label: 'Draft — not set up yet', cls: 'text-amber-600 bg-amber-50 border-amber-200', icon: XCircle },
};

export default function CrmSyncPage() {
  const tourRef = useRef<GuidedTourHandle>(null);
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
  const [urlCopied, setUrlCopied] = useState(false);

  const [mappingTarget, setMappingTarget] = useState(MAPPING_TARGETS[0]);
  const [mappingFields, setMappingFields] = useState<MappingField[]>([]);
  const [savingMapping, setSavingMapping] = useState(false);

  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [webhookEvents, setWebhookEvents] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

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

  const loadInbound = useCallback(async () => {
    const [evRes, invRes] = await Promise.all([
      fetch('/api/admin/integrations/crm/webhook-events?limit=10').then((r) => r.json()),
      fetch('/api/admin/integrations/crm/invoices?limit=10').then((r) => r.json()),
    ]);
    if (evRes.success) setWebhookEvents(evRes.data);
    if (invRes.success) setInvoices(invRes.data);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadMapping(mappingTarget); }, [mappingTarget, loadMapping]);
  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => { loadInbound(); }, [loadInbound]);

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

  const copyWebhookUrl = () => {
    if (!webhookInfo) return;
    const full = window.location.origin + webhookInfo.webhookUrl;
    navigator.clipboard.writeText(full).then(() => {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    });
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
  const fullWebhookUrl = webhookInfo ? (typeof window !== 'undefined' ? window.location.origin : '') + webhookInfo.webhookUrl : '';

  return (
    <div className="space-y-6 max-w-4xl">
      <GuidedTour ref={tourRef} tourId="crm-sync-setup" steps={CRM_SYNC_TOUR_STEPS} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Plug size={22} /> CRM Sync</h1>
          <p className="text-sm text-gray-500 mt-0.5">Connects this website to your clinic's CRM — one page, three simple flows: what we send them, what we check on their end, and what they send us.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => tourRef.current?.start()}
            className="inline-flex items-center gap-1.5 border border-[#F5A623]/40 bg-[#F5A623]/10 text-[#0B2560] px-3 py-1.5 rounded-full text-xs font-bold hover:bg-[#F5A623]/20 transition">
            <Sparkles size={13} className="text-[#F5A623]" /> Replay Guide
          </button>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${meta.cls}`}>
            <StatusIcon size={13} /> {meta.label}
          </span>
        </div>
      </div>

      {/* Plain-language map of the whole page */}
      <div className="bg-[#0B2560] text-white rounded-2xl p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-white/60 mb-3">How this works, in plain terms</p>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="flex gap-2.5">
            <ArrowUpFromLine size={16} className="text-[#F5A623] shrink-0 mt-0.5" />
            <div><p className="font-semibold">We send them</p><p className="text-white/60 text-xs mt-0.5">Every website enquiry/booking, automatically, the moment it happens.</p></div>
          </div>
          <div className="flex gap-2.5">
            <RefreshCw size={16} className="text-[#F5A623] shrink-0 mt-0.5" />
            <div><p className="font-semibold">We check periodically</p><p className="text-white/60 text-xs mt-0.5">Doctor list & branch info — these rarely change, so we poll instead of needing a live feed.</p></div>
          </div>
          <div className="flex gap-2.5">
            <ArrowDownToLine size={16} className="text-[#F5A623] shrink-0 mt-0.5" />
            <div><p className="font-semibold">They send us</p><p className="text-white/60 text-xs mt-0.5">Leads &amp; invoices, the instant one is created in their CRM — one URL, no polling needed on their side.</p></div>
          </div>
        </div>
      </div>

      {/* Connection + health */}
      <Section title="Connection" subtitle="The basics — where your CRM lives and how we prove who we are.">
        <div className="grid sm:grid-cols-2 gap-3">
          <FieldInput label="Name" value={connector.name} onChange={(v) => setConnector({ ...connector, name: v })} />
          <FieldInput label="CRM Provider (free text)" value={connector.provider} onChange={(v) => setConnector({ ...connector, provider: v })} placeholder="e.g. leadsquared" />
        </div>
        <div data-tour="connection-baseurl">
          <FieldInput label="Base URL (your CRM's API address)" value={connector.config.baseUrl} onChange={(v) => setConnector({ ...connector, config: { ...connector.config, baseUrl: v } })} placeholder="https://api.yourcrm.com" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Status</label>
          <select value={connector.status} onChange={(e) => setConnector({ ...connector, status: e.target.value as any })}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
            <option value="draft">Draft — being set up, nothing runs yet</option>
            <option value="active">Active — everything below is live</option>
            <option value="paused">Paused — temporarily stopped</option>
          </select>
        </div>
        <div data-tour="connection-auth">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Authentication</label>
          <select value={authType} onChange={(e) => { setAuthType(e.target.value); setAuthFields({}); }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3">
            {AUTH_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <AuthFieldsEditor authType={authType} values={authFields} onChange={setAuthFields} />
          <p className="text-[11px] text-gray-400 mt-2">{authInfo?.last4 ? `Currently saved: ${authInfo.authType}, ending •••${authInfo.last4}` : 'Not saved yet.'}</p>
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
          <button onClick={saveAuth} disabled={savingAuth}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
            {savingAuth ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Credentials
          </button>
          <button onClick={saveConfig} disabled={saving}
            className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d2d72] disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Connection
          </button>
          <button onClick={testConnection} disabled={testing}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />} Test Connection
          </button>
        </div>
        {testResult && (
          <div className={`text-sm px-3 py-2 rounded-lg ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {testResult.ok ? `✓ Connected (${testResult.latencyMs}ms)` : `✗ ${testResult.message}`}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-gray-50">
          <div><p className="text-gray-400">Last check</p><p className="font-semibold text-gray-700">{fmt(connector.health.lastCheckAt)}</p></div>
          <div><p className="text-gray-400">Avg response</p><p className="font-semibold text-gray-700">{connector.health.avgResponseMs ? `${connector.health.avgResponseMs}ms` : '—'}</p></div>
          <div><p className="text-gray-400">Last check we did</p><p className="font-semibold text-gray-700">{fmt(connector.health.lastSyncAt)}</p></div>
          <div><p className="text-gray-400">Failed in a row</p><p className="font-semibold text-gray-700">{connector.health.consecutiveFailures} {connector.health.consecutiveFailures >= 5 && '(paused automatically)'}</p></div>
        </div>
        <p className="text-[11px] text-gray-400">"Test Connection" pings your CRM once, just to confirm we can reach it — it doesn't send or receive any real data. If a real sync fails 5 times in a row, this connector pauses itself automatically and your team gets a WhatsApp alert, so a broken connection never fails silently.</p>
      </Section>

      {/* Outbound push */}
      <Section title="What we send TO your CRM" subtitle="Automatic — fires the moment a patient submits an enquiry or books online. Nothing for your developer to build here except receiving it.">
        <div data-tour="push-endpoints">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Where we send it (ask your CRM developer for these)</label>
          <div className="space-y-2">
            {PUSH_OPERATIONS.map((op) => (
              <div key={op} className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500 w-40 shrink-0">{op}</span>
                <input value={connector.config.endpoints?.[op] || ''}
                  onChange={(e) => setConnector({ ...connector, config: { ...connector.config, endpoints: { ...connector.config.endpoints, [op]: e.target.value } } })}
                  placeholder="/api/v2/leads"
                  className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
              </div>
            ))}
          </div>
        </div>
        <button onClick={saveConfig} disabled={saving}
          className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d2d72] disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
        </button>
      </Section>

      {/* Periodic pull */}
      <Section title="What we check periodically" subtitle="Doctor list & branch info — these change rarely, so we poll instead of needing a live feed.">
        <div data-tour="pull-endpoints">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Where we check (ask your CRM developer for these)</label>
          <div className="space-y-2">
            {PULL_OPERATIONS.map((op) => (
              <div key={op} className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500 w-40 shrink-0">{op}</span>
                <input value={connector.config.endpoints?.[op] || ''}
                  onChange={(e) => setConnector({ ...connector, config: { ...connector.config, endpoints: { ...connector.config.endpoints, [op]: e.target.value } } })}
                  placeholder="/api/v2/doctors"
                  className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <FieldInput label="Check every (minutes)" type="number" value={connector.config.pullIntervalMin} onChange={(v) => setConnector({ ...connector, config: { ...connector.config, pullIntervalMin: Number(v) } })} />
          <button onClick={saveConfig} disabled={saving}
            className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d2d72] disabled:opacity-50 self-end">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
          <button onClick={syncNow} disabled={syncing}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 self-end">
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Check Now
          </button>
        </div>
        {syncResult && (
          <div className={`text-sm px-3 py-2 rounded-lg ${syncResult.success ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
            {syncResult.success
              ? `Updated ${syncResult.itemsSynced}/${syncResult.itemsTotal} · ${syncResult.itemsUnmatched} unmatched · ${syncResult.itemsFailed} failed`
              : `✗ ${syncResult.message}`}
          </div>
        )}
      </Section>

      {/* Inbound webhook */}
      <Section title="What your CRM sends US" subtitle="Leads and invoices, the instant one is created or updated — event-driven, not polled.">
        <div data-tour="webhook-url">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Give this URL to your CRM developer</label>
          <div className="flex items-center gap-2">
            <input readOnly value={fullWebhookUrl} className="flex-1 border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-mono bg-gray-50" />
            <button onClick={copyWebhookUrl} disabled={!webhookInfo}
              className="shrink-0 flex items-center gap-1.5 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-40">
              {urlCopied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />} {urlCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            Their system should <strong>POST</strong> to this one URL whenever a lead or invoice is created/updated —
            with <code className="bg-gray-100 px-1 rounded">event</code> set to <code className="bg-gray-100 px-1 rounded">lead.created</code>, <code className="bg-gray-100 px-1 rounded">invoice.created</code>, or <code className="bg-gray-100 px-1 rounded">invoice.updated</code> in the JSON body.
          </p>
        </div>
        <div data-tour="webhook-secret">
          <FieldInput label="Signing Secret (from your CRM's webhook settings — proves the call really came from them)" value={webhookSecret} onChange={setWebhookSecret} placeholder={webhookInfo?.last4 ? `•••${webhookInfo.last4} — paste a new one to replace` : 'paste secret'} />
        </div>
        <button onClick={saveWebhookSecret} disabled={savingWebhook || !webhookSecret}
          className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d2d72] disabled:opacity-50 disabled:cursor-not-allowed">
          {savingWebhook ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Webhook Secret
        </button>

        <div className="grid sm:grid-cols-2 gap-4 pt-3 border-t border-gray-50">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Recent calls from your CRM</p>
            {webhookEvents.length === 0 ? <p className="text-xs text-gray-400">Nothing received yet.</p> : (
              <div className="space-y-1.5">
                {webhookEvents.map((ev) => (
                  <div key={ev._id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-2.5 py-1.5">
                    <span className="font-mono text-gray-600">{ev.event}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${ev.status === 'processed' ? 'bg-green-100 text-green-700' : ev.status === 'failed' || ev.status === 'ignored' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{ev.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Recent invoices received</p>
            {invoices.length === 0 ? <p className="text-xs text-gray-400">None yet.</p> : (
              <div className="space-y-1.5">
                {invoices.map((inv) => (
                  <div key={inv._id} className="text-xs bg-gray-50 rounded-lg px-2.5 py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-700">{inv.patientName || '—'}</span>
                      <span className="font-mono text-gray-500">₹{inv.amount}</span>
                    </div>
                    <p className="text-gray-400 text-[10px] mt-0.5">{inv.doctorName || 'No doctor'} · {(inv.treatments || []).join(', ') || 'No treatment listed'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <p className="text-[11px] text-gray-400 flex items-center gap-1.5"><Clock size={11} /> Leads land in the normal Bookings list (source: "CRM"). Invoices show here and link to a matching patient by phone number when one exists.</p>
      </Section>

      {/* Field Mapping */}
      <Section title="Field Mapping" subtitle="Tell us which of your CRM's field names correspond to ours, for each of the 6 things that move between the two systems.">
        <div className="flex flex-wrap gap-2" data-tour="mapping-tabs">
          {MAPPING_TARGETS.map((t) => (
            <button key={`${t.capability}-${t.direction}`} onClick={() => setMappingTarget(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${mappingTarget.capability === t.capability && mappingTarget.direction === t.direction ? 'bg-[#0B2560] text-white border-[#0B2560]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 -mt-1">{mappingTarget.blurb}</p>
        <div data-tour="mapping-static">
          <MappingEditor fields={mappingFields} onChange={setMappingFields} direction={mappingTarget.direction} />
        </div>
        <button onClick={saveMapping} disabled={savingMapping} data-tour="save-mapping"
          className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d2d72] disabled:opacity-50">
          {savingMapping ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Mapping
        </button>
      </Section>

      {/* Logs */}
      <Section title="Technical Log" subtitle="Every request attempt, for troubleshooting — the panels above are the friendlier summary.">
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
  const add = () => onChange([...fields, { platformField: '', externalField: '', transform: '', required: false, staticValue: '' }]);
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
          Our field {direction === 'push' ? '→' : '←'} their field
        </label>
        <button onClick={add} className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline">
          <Plus size={10} /> Add Field
        </button>
      </div>
      <div className="space-y-2">
        {fields.map((f, i) => {
          const isStatic = !!f.staticValue;
          // The "source" side (read from a real record) is what a static
          // value replaces. The "destination" side (where the value ends
          // up) is always a real field name, static or not — push writes
          // to externalField, pull writes to platformField.
          const sourceInput = isStatic ? (
            <input value={f.staticValue} onChange={(e) => update(i, { staticValue: e.target.value })} placeholder="fixed value, always used"
              className="flex-1 min-w-[100px] border border-amber-200 bg-amber-50 rounded-lg px-2 py-1.5 text-xs font-mono" />
          ) : direction === 'push' ? (
            <input value={f.platformField} onChange={(e) => update(i, { platformField: e.target.value })} placeholder="our field name"
              className="flex-1 min-w-[100px] border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono" />
          ) : (
            <input value={f.externalField} onChange={(e) => update(i, { externalField: e.target.value })} placeholder="their field name"
              className="flex-1 min-w-[100px] border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono" />
          );
          const destInput = direction === 'push' ? (
            <input value={f.externalField} onChange={(e) => update(i, { externalField: e.target.value })} placeholder="their field name"
              className="flex-1 min-w-[100px] border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono" />
          ) : (
            <input value={f.platformField} onChange={(e) => update(i, { platformField: e.target.value })} placeholder="our field name"
              className="flex-1 min-w-[100px] border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono" />
          );
          return (
            <div key={i} className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-xl p-2.5">
              {sourceInput}
              <span className="text-gray-300 text-xs">{direction === 'push' ? '→' : '←'}</span>
              {destInput}
              <label className="flex items-center gap-1 text-[10px] text-gray-500 shrink-0" title="Instead of reading this from a real record, always send/expect the same fixed value.">
                <input type="checkbox" checked={isStatic} onChange={(e) => update(i, { staticValue: e.target.checked ? (f.staticValue || 'website') : '' })} /> fixed value
              </label>
              {!isStatic && (
                <input value={f.transform} onChange={(e) => update(i, { transform: e.target.value })} placeholder="transform (optional)"
                  className="w-32 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono" />
              )}
              <label className="flex items-center gap-1 text-[10px] text-gray-500 shrink-0">
                <input type="checkbox" checked={f.required} onChange={(e) => update(i, { required: e.target.checked })} disabled={isStatic} /> required
              </label>
              <button onClick={() => remove(i)} className="text-gray-300 hover:text-red-500 shrink-0"><X size={13} /></button>
            </div>
          );
        })}
        {fields.length === 0 && <p className="text-xs text-gray-400">No fields mapped yet.</p>}
      </div>
    </div>
  );
}

function fmt(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
