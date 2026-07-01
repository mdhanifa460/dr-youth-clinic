'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Loader, Info, ExternalLink } from 'lucide-react';
import { DEFAULT_ADS_CONFIG, ADS_SLOT_LABELS, type AdSlotKey, type AdsConfig } from '@/app/lib/adsConstants';

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        value ? 'bg-[#0B2560]' : 'bg-gray-200'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

const SLOT_KEYS = Object.keys(ADS_SLOT_LABELS) as AdSlotKey[];

export default function AdsSettingsPage() {
  const [config, setConfig] = useState<AdsConfig>(DEFAULT_ADS_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/ads');
        const data = await res.json();
        if (data.success && data.data) {
          setConfig(prev => ({
            ...prev,
            ...data.data,
            slots: { ...prev.slots, ...data.data.slots },
          }));
        }
      } finally { setLoading(false); }
    })();
  }, []);

  const set = (key: keyof AdsConfig, val: any) =>
    setConfig(prev => ({ ...prev, [key]: val }));

  const setSlot = (slotKey: AdSlotKey, field: 'slotId' | 'enabled', val: any) =>
    setConfig(prev => ({
      ...prev,
      slots: { ...prev.slots, [slotKey]: { ...prev.slots[slotKey], [field]: val } },
    }));

  const save = async () => {
    setSaving(true); setStatus('idle');
    try {
      const res = await fetch('/api/admin/ads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      setStatus(res.ok ? 'saved' : 'error');
      setTimeout(() => setStatus('idle'), 3000);
    } catch { setStatus('error'); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  const isFullyConfigured = config.publisherId && SLOT_KEYS.some(k => config.slots[k].slotId && config.slots[k].enabled);

  return (
    <div className="min-h-screen bg-[#f6faff]">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0B2560]">Google Ads</h1>
          <p className="text-gray-400 text-sm mt-1">
            Configure Google AdSense display ads — control which positions are active and toggle ads on or off globally.
          </p>
        </div>

        <div className="space-y-5">

          {/* ── Global toggle card ── */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 flex items-center justify-between">
              <div className="flex-1 pr-6">
                <p className="font-bold text-[#0B2560] text-base">Enable Google Ads</p>
                <p className="text-sm text-gray-400 mt-0.5">
                  {config.enabled
                    ? 'Ads are live on the public site.'
                    : 'Ads are disabled — no code is injected, zero impact on page load.'}
                </p>
              </div>
              <Toggle value={config.enabled} onChange={v => set('enabled', v)} />
            </div>

            {config.enabled && (
              <div className="border-t border-gray-50 px-6 py-4 bg-amber-50 flex items-start gap-3">
                <Info size={15} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  AdSense requires your site to be approved and your Publisher ID to be set below. Ads will only render once AdSense validates your account.
                </p>
              </div>
            )}
          </div>

          {/* ── Test mode card ── */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-6 py-5 flex items-center justify-between">
            <div className="flex-1 pr-6">
              <p className="font-bold text-[#0B2560] text-base">Test Mode</p>
              <p className="text-sm text-gray-400 mt-0.5">
                Show placeholder boxes on the site instead of live ads — safe for development and previewing layouts.
              </p>
            </div>
            <Toggle value={config.testMode} onChange={v => set('testMode', v)} disabled={!config.enabled} />
          </div>

          {/* ── Publisher ID card ── */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-6 py-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-bold text-[#0B2560] text-base">Publisher ID</p>
                <p className="text-sm text-gray-400 mt-0.5">Format: <span className="font-mono text-[#3B82C4]">ca-pub-XXXXXXXXXXXXXXXX</span></p>
              </div>
              <a
                href="https://www.google.com/adsense/start/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#3B82C4] font-semibold flex items-center gap-1 hover:underline mt-0.5"
              >
                Get Publisher ID <ExternalLink size={11} />
              </a>
            </div>
            <input
              type="text"
              value={config.publisherId}
              onChange={e => set('publisherId', e.target.value)}
              placeholder="ca-pub-1234567890123456"
              disabled={!config.enabled}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 focus:border-[#0B2560] disabled:bg-gray-50 disabled:text-gray-400 transition"
            />
          </div>

          {/* ── Ad Slots card ── */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-50">
              <p className="font-bold text-[#0B2560] text-base">Ad Positions</p>
              <p className="text-sm text-gray-400 mt-0.5">
                Configure each ad placement. Get Ad Unit IDs from your{' '}
                <a href="https://adsense.google.com/adsense/app#home" target="_blank" rel="noopener noreferrer"
                  className="text-[#3B82C4] font-semibold hover:underline">AdSense dashboard</a>.
              </p>
            </div>

            <div className="divide-y divide-gray-50">
              {SLOT_KEYS.map(key => {
                const slot = config.slots[key];
                return (
                  <div key={key} className={`px-6 py-5 transition-colors ${!config.enabled ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0B2560] leading-tight">{ADS_SLOT_LABELS[key]}</p>
                        <p className="text-[10px] font-mono text-gray-400 mt-0.5 uppercase tracking-wider">{key}</p>
                      </div>
                      <Toggle
                        value={slot.enabled}
                        onChange={v => setSlot(key, 'enabled', v)}
                        disabled={!config.enabled}
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={slot.slotId}
                        onChange={e => setSlot(key, 'slotId', e.target.value)}
                        placeholder="Ad Unit ID (e.g. 1234567890)"
                        disabled={!config.enabled || !slot.enabled}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 focus:border-[#0B2560] disabled:bg-gray-50 disabled:text-gray-300 transition"
                      />
                      {slot.enabled && slot.slotId && config.enabled && (
                        <CheckCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Setup guide ── */}
          <div className="bg-[#f0f4ff] rounded-3xl border border-blue-100 px-6 py-5">
            <p className="font-bold text-[#0B2560] text-sm mb-3 flex items-center gap-2">
              <Info size={14} className="text-[#3B82C4]" /> Quick Setup Guide
            </p>
            <ol className="space-y-2 text-xs text-gray-600">
              {[
                'Create a Google AdSense account and get approved at adsense.google.com',
                'Copy your Publisher ID (ca-pub-XXXXXXXXXXXXXXXX) from the AdSense dashboard',
                'Create ad units in AdSense → Ads → By ad unit → Display ads',
                'Copy each Ad Unit ID and paste it into the matching position above',
                'Enable "Test Mode" while setting up to preview placements without real ads',
                'Once everything looks right, disable Test Mode and enable Ads globally',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-[#0B2560] text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* ── Save button ── */}
          <div className="flex items-center justify-between pt-2">
            {status === 'saved' && (
              <span className="flex items-center gap-2 text-sm text-green-600 font-semibold">
                <CheckCircle size={15} /> Saved successfully
              </span>
            )}
            {status === 'error' && (
              <span className="flex items-center gap-2 text-sm text-red-600 font-semibold">
                <AlertCircle size={15} /> Save failed — try again
              </span>
            )}
            {status === 'idle' && <div />}
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 bg-[#0B2560] text-white px-8 py-3 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition shadow-lg shadow-[#0B2560]/20 disabled:opacity-60 disabled:cursor-not-allowed ml-auto"
            >
              {saving ? <><Loader size={14} className="animate-spin" /> Saving…</> : 'Save Ads Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
