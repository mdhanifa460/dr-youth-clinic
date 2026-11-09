'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader, CheckCircle2, AlertTriangle, Link2, RefreshCw } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa';

type Branch = 'chennai' | 'bangalore' | 'coimbatore' | 'kochi' | '';
interface Listing {
  account: string;
  location: string;
  title: string;
  address: string;
  branch: Branch;
  averageRating?: number | null;
  totalReviewCount?: number | null;
}
interface Status {
  configured: boolean;
  connected: boolean;
  connectedByEmail: string;
  connectedAt: string | null;
  locations: Listing[];
  lastSyncSource: 'business_profile' | 'places' | null;
  lastSyncError: string;
}

const BRANCH_OPTIONS: { value: Branch; label: string }[] = [
  { value: '', label: "Don't import" },
  { value: 'chennai', label: 'Chennai' },
  { value: 'bangalore', label: 'Bangalore' },
  { value: 'coimbatore', label: 'Coimbatore' },
  { value: 'kochi', label: 'Kochi' },
];

// Google Business Profile connection for Admin → Reviews: connect the
// clinic's Google account once, match each Google listing to a branch, and
// the existing "Sync Google" button (plus a daily automatic sync) imports
// every review for those branches.
export default function GoogleBusinessPanel({ onConnectedChange }: { onConnectedChange?: (connected: boolean) => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [busy, setBusy] = useState<'' | 'load' | 'save' | 'disconnect'>('');
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [open, setOpen] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const d = await (await fetch('/api/admin/google-business/status')).json();
      if (d.success) {
        setStatus(d);
        onConnectedChange?.(!!d.connected);
        if (!d.connected || d.locations.length === 0) setOpen(true);
      }
    } catch { /* panel stays hidden */ }
  }, [onConnectedChange]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const loadListings = async () => {
    setBusy('load'); setMsg(null);
    try {
      const d = await (await fetch('/api/admin/google-business/locations')).json();
      if (d.success) {
        setListings(d.locations);
        if (d.locations.length === 0) setMsg({ text: 'This Google account does not manage any Business Profile listings.', error: true });
      } else setMsg({ text: d.message, error: true });
    } catch { setMsg({ text: 'Could not reach the server.', error: true }); }
    setBusy('');
  };

  const saveListings = async () => {
    if (!listings) return;
    setBusy('save'); setMsg(null);
    try {
      const d = await (await fetch('/api/admin/google-business/locations', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locations: listings }),
      })).json();
      if (d.success) {
        setMsg({ text: 'Branch matching saved. Click "Sync Google" to import the reviews now, or wait for the daily sync.', error: false });
        setListings(null);
        fetchStatus();
      } else setMsg({ text: d.message, error: true });
    } catch { setMsg({ text: 'Could not reach the server.', error: true }); }
    setBusy('');
  };

  const disconnect = async () => {
    if (!confirm('Disconnect Google? Reviews already imported stay, but no new ones will sync until you connect again.')) return;
    setBusy('disconnect'); setMsg(null);
    try {
      const d = await (await fetch('/api/admin/google-business/disconnect', { method: 'POST' })).json();
      if (!d.success) setMsg({ text: d.message, error: true });
    } catch { setMsg({ text: 'Could not reach the server.', error: true }); }
    setBusy('');
    setListings(null);
    fetchStatus();
  };

  if (!status) return null;
  const matched = status.locations.filter((l) => l.branch);
  const summary = !status.configured
    ? 'Not set up yet'
    : !status.connected
      ? 'Not connected'
      : matched.length === 0
        ? 'Connected, but no listing matched to a branch'
        : `Connected · ${matched.length} branch${matched.length === 1 ? '' : 'es'} syncing daily`;
  const healthy = status.connected && matched.length > 0;

  return (
    <div className="mb-6 bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <FaGoogle size={14} className="text-[#EA4335] shrink-0" />
          <span className="font-bold text-sm text-[#0B2560]">Google Business Profile</span>
          <span className={`text-xs truncate ${healthy ? 'text-green-600' : 'text-amber-600'}`}>{summary}</span>
        </span>
        <span className="text-xs text-gray-400 shrink-0">{open ? 'Hide' : 'Manage'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-4 text-sm">
          {!status.configured && (
            <div className="text-gray-600 space-y-2">
              <p>Google sign-in isn&apos;t set up on the server yet. Whoever manages Vercel needs to add these settings (values come from the Google Cloud project&apos;s OAuth client):</p>
              <ul className="list-disc pl-5 text-xs font-mono text-gray-700">
                <li>GOOGLE_CLIENT_ID</li>
                <li>GOOGLE_CLIENT_SECRET</li>
              </ul>
              <p className="text-xs text-gray-500">
                In that OAuth client, add this authorised redirect address:{' '}
                <code className="break-all bg-gray-50 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}/api/admin/google-business/callback</code>
              </p>
            </div>
          )}

          {status.configured && !status.connected && (
            <div className="space-y-3">
              <p className="text-gray-600">
                Sign in once with the Google account that manages all four branch listings. Business Profile API access must
                already be approved by Google for this to work.
              </p>
              <a
                href="/api/admin/google-business/authorize"
                className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d2d73] transition"
              >
                <Link2 size={14} /> Connect Google
              </a>
            </div>
          )}

          {status.connected && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-gray-600 min-w-0">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                  <span className="truncate">
                    Connected{status.connectedByEmail ? ` by ${status.connectedByEmail}` : ''}
                    {status.connectedAt ? ` on ${new Date(status.connectedAt).toLocaleDateString('en-IN')}` : ''}
                  </span>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button" onClick={loadListings} disabled={!!busy}
                    className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0B2560] hover:bg-gray-50 disabled:opacity-60"
                  >
                    {busy === 'load' ? <Loader size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    {listings ? 'Reload listings' : 'Match branches'}
                  </button>
                  <button
                    type="button" onClick={disconnect} disabled={!!busy}
                    className="border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-red-600 hover:border-red-200 disabled:opacity-60"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              {!listings && status.locations.length > 0 && (
                <ul className="divide-y divide-gray-50 border border-gray-100 rounded-xl">
                  {status.locations.map((l) => (
                    <li key={`${l.account}/${l.location}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span className="min-w-0">
                        <span className="block font-semibold text-gray-700 truncate">{l.title || l.location}</span>
                        {typeof l.totalReviewCount === 'number' && (
                          <span className="block text-[11px] text-gray-400">
                            {l.totalReviewCount} reviews on Google{typeof l.averageRating === 'number' ? ` · ${l.averageRating.toFixed(1)}★` : ''} (admin reference only)
                          </span>
                        )}
                      </span>
                      <span className={`text-xs font-semibold shrink-0 ${l.branch ? 'text-[#0B2560] capitalize' : 'text-gray-400'}`}>
                        {l.branch || 'Not imported'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {listings && listings.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">Choose which branch each Google listing is. A suggestion is filled in from the listing&apos;s name and address; please check it.</p>
                  <ul className="divide-y divide-gray-50 border border-gray-100 rounded-xl">
                    {listings.map((l, i) => (
                      <li key={`${l.account}/${l.location}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3">
                        <span className="min-w-0">
                          <span className="block font-semibold text-gray-700 [overflow-wrap:anywhere]">{l.title || l.location}</span>
                          <span className="block text-[11px] text-gray-400 [overflow-wrap:anywhere]">{l.address}</span>
                        </span>
                        <select
                          aria-label={`Branch for ${l.title || l.location}`}
                          value={l.branch}
                          onChange={(e) => setListings((prev) => prev!.map((x, j) => (j === i ? { ...x, branch: e.target.value as Branch } : x)))}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-[#0B2560] bg-white shrink-0"
                        >
                          {BRANCH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button" onClick={saveListings} disabled={!!busy}
                    className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d2d73] disabled:opacity-60"
                  >
                    {busy === 'save' && <Loader size={14} className="animate-spin" />} Save branch matching
                  </button>
                </div>
              )}

              {status.lastSyncSource === 'business_profile' && status.lastSyncError && (
                <p className="flex items-start gap-1.5 text-xs text-amber-700">
                  <AlertTriangle size={12} className="shrink-0 mt-0.5" /> Last sync: {status.lastSyncError}
                </p>
              )}
            </>
          )}

          {msg && (
            <p className={`text-xs px-3 py-2 rounded-lg ${msg.error ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-700'}`}>{msg.text}</p>
          )}

          <p className="text-[11px] text-gray-400">
            Imported reviews appear here for the team. They show on the public website only when
            &ldquo;Before / After and Patient Reviews&rdquo; is switched on in Settings → Public Display, which stays off until legal approval.
          </p>
        </div>
      )}
    </div>
  );
}
