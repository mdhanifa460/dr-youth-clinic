'use client';

// Domain Migration — compares dryouthclinic.co.in (old) against
// dryouthclinics.com (new) across traffic, SEO, leads, and bookings, to
// give an evidence-based answer to "can the old domain be retired" that
// isn't just "20 leads on the new domain" (see the approved audit).
//
// Self-fetches from /api/admin/domain-migration instead of using the
// `data` prop every other Intelligence panel receives from
// IntelligenceShell's shared /api/admin/intelligence fetch — this is a
// genuinely different data source (GA4 + GSC + a 1hr cache, vs. the
// shared panel's 60s MongoDB-only cache) with its own loading/empty
// states, so coupling it into the shared fetch would only complicate
// both. The `data` prop is still accepted, for structural compatibility
// with the shared `sections: Record<string, ComponentType<{data:any}>>`
// map in marketing-intelligence/page.tsx — just unused here.
import { useEffect, useState } from 'react';
import { SectionHeader, StatCard, HBarChart, DonutChart, InsightCard } from './Charts';
import { Loader2, AlertCircle, ExternalLink, ShieldCheck, ShieldAlert, ShieldQuestion, HelpCircle } from 'lucide-react';
import RedirectMappingsPanel from './RedirectMappingsPanel';

interface DomainMigrationData {
  success: boolean;
  enabled?: boolean;
  message?: string;
  generatedAt?: string;
  config?: {
    ga4Configured: boolean;
    gscOldConfigured: boolean;
    gscNewConfigured: boolean;
    migratedTrafficAvailable: boolean;
    oldDomain: string;
  };
  traffic?: {
    new: { users: number; sessions: number; source: 'ga4' };
    old: { users: number | null; sessions: number | null; source: 'ga4_migrated' | 'unavailable' };
  };
  channelBreakdown?: Array<{ channel: string; sessions: number }>;
  gsc?: {
    old: { configured: boolean; totals: { clicks: number; impressions: number; ctr: number; position: number } };
    new: { configured: boolean; totals: { clicks: number; impressions: number; ctr: number; position: number } };
  };
  oldUrls?: Array<{ page: string; impressions: number; clicks: number; redirectStatus: 'ok' | 'broken' | 'unchecked'; redirectsTo: string | null }>;
  leadsBookings?: {
    old: { leads: number; bookings: number };
    new: { leads: number; bookings: number };
    historicalUnavailable: { leads: number; bookings: number };
  };
  trend?: Array<{ period: string; oldLeads: number; newLeads: number; oldBookings: number; newBookings: number }>;
  health?: {
    status: 'healthy' | 'monitor' | 'significant' | 'insufficient_data';
    recommendation: 'safe_to_review' | 'continue_redirect' | 'significant_old_traffic' | 'connect_data_sources';
    reasons: string[];
    thresholds: { healthy: number; monitor: number; organicFloor: number };
  };
}

const RECOMMENDATION_COPY: Record<string, { label: string; icon: any; color: string; bg: string; border: string; statusPill: string }> = {
  safe_to_review: { label: 'Safe to Review', icon: ShieldCheck, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', statusPill: '🟢 Healthy' },
  continue_redirect: { label: 'Continue Redirect', icon: ShieldQuestion, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', statusPill: '🟡 Monitor' },
  significant_old_traffic: { label: 'Significant Old Traffic', icon: ShieldAlert, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', statusPill: '🔴 Significant' },
  connect_data_sources: { label: 'Not Enough Data Yet', icon: HelpCircle, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', statusPill: '⚪ Insufficient Data' },
};

function SourceTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 ml-1.5 align-middle">
      {children}
    </span>
  );
}

function pct(part: number, whole: number): string {
  if (whole <= 0) return '—';
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

export default function DomainMigrationIntelligence({ data: _data }: { data: any }) {
  const [data, setData] = useState<DomainMigrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/domain-migration')
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) { setError(json.message || 'Failed to load'); return; }
        setData(json);
      })
      .catch(() => setError('Network error — please try again.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-300" size={24} /></div>;
  }
  if (error) {
    return <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>;
  }
  if (!data || data.enabled === false) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Domain Migration" subtitle="Compare traffic, SEO, leads, and bookings between the old and new domain." badge="Marketing Analytics" />
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600">
          The traffic-comparison dashboard is turned off. Enable it in Settings → Analytics → Domain Migration.
        </div>
        {/* URL redirect mapping is independent of the analytics-comparison
            toggle above — it works purely off the site's own DB/sitemap
            import, no GA4/GSC config required. */}
        <RedirectMappingsPanel />
      </div>
    );
  }

  const cfg = data.config!;
  const traffic = data.traffic!;
  const lb = data.leadsBookings!;
  const health = data.health!;
  const rec = RECOMMENDATION_COPY[health.recommendation];
  const RecIcon = rec.icon;

  const totalOldTraffic = traffic.old.sessions ?? 0;
  const totalTraffic = traffic.new.sessions + totalOldTraffic;
  const totalLeads = lb.old.leads + lb.new.leads;
  const totalBookings = lb.old.bookings + lb.new.bookings;

  const setupNeeded = !cfg.ga4Configured || !cfg.gscOldConfigured;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Domain Migration"
        subtitle={`${cfg.oldDomain || 'old domain'} → dryouthclinics.com — evidence across traffic, SEO, leads, and bookings, not just a lead count.`}
        badge="Marketing Analytics"
      />

      {/* Setup notice — honest about what's live vs. pending, per the
          audit's "clearly distinguish data sources" requirement. */}
      {setupNeeded && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3.5 text-xs text-blue-800 space-y-1.5">
          <p className="flex items-start gap-2"><AlertCircle size={14} className="shrink-0 mt-0.5" /><strong>Some data sources aren't connected yet — showing what's real from what is.</strong></p>
          <ul className="pl-6 list-disc space-y-0.5">
            {!cfg.ga4Configured && <li>GA4 Data API — add a GA4 property ID and service-account credentials in Settings → Analytics.</li>}
            {!cfg.gscOldConfigured && <li>Search Console for the old domain — register/verify the old-domain property in Search Console, then add its site URL in Settings → Analytics.</li>}
            {!cfg.migratedTrafficAvailable && cfg.ga4Configured && <li>Old-domain-tagged GA4 traffic needs one more one-time step: map the <code className="bg-white px-1 rounded">migration_session</code> dataLayer event to a GA4 custom dimension in GTM.</li>}
          </ul>
        </div>
      )}

      {/* E — Migration health */}
      <div className={`rounded-2xl border ${rec.border} ${rec.bg} px-5 py-4`}>
        <div className="flex items-start gap-3">
          <RecIcon size={22} className={`shrink-0 ${rec.color}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-extrabold ${rec.color}`}>{rec.label}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${rec.bg} ${rec.color} border ${rec.border}`}>
                {rec.statusPill}
              </span>
            </div>
            <ul className="mt-2 space-y-1">
              {health.reasons.map((r, i) => (
                <li key={i} className="text-xs text-gray-700">{r}</li>
              ))}
            </ul>
            <p className="text-[10px] text-gray-400 mt-2">This is a recommendation only — the old domain is never disabled automatically. Thresholds are admin-editable in Settings → Analytics.</p>
          </div>
        </div>
      </div>

      {/* A — Traffic comparison */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <p className="text-sm font-bold text-[#0B2560]">Traffic Comparison <SourceTag>GA4</SourceTag></p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                {['Metric', 'Old Domain', 'New Domain', 'Share'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td className="px-4 py-3 font-medium text-gray-800">Users</td>
                <td className="px-4 py-3 text-gray-700">{traffic.old.users ?? <span className="text-gray-400">Unavailable</span>}</td>
                <td className="px-4 py-3 text-gray-700">{traffic.new.users}</td>
                <td className="px-4 py-3 text-gray-500">{traffic.old.users != null ? pct(traffic.old.users, traffic.old.users + traffic.new.users) : '—'}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-gray-800">Sessions</td>
                <td className="px-4 py-3 text-gray-700">{traffic.old.sessions ?? <span className="text-gray-400">Unavailable</span>}</td>
                <td className="px-4 py-3 text-gray-700">{traffic.new.sessions}</td>
                <td className="px-4 py-3 text-gray-500">{traffic.old.sessions != null ? pct(traffic.old.sessions, totalTraffic) : '—'}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-gray-800">Leads <SourceTag>DB</SourceTag></td>
                <td className="px-4 py-3 text-gray-700">{lb.old.leads}</td>
                <td className="px-4 py-3 text-gray-700">{lb.new.leads}</td>
                <td className="px-4 py-3 text-gray-500">{pct(lb.old.leads, totalLeads)}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-gray-800">Bookings <SourceTag>DB</SourceTag></td>
                <td className="px-4 py-3 text-gray-700">{lb.old.bookings}</td>
                <td className="px-4 py-3 text-gray-700">{lb.new.bookings}</td>
                <td className="px-4 py-3 text-gray-500">{pct(lb.old.bookings, totalBookings)}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-gray-800">Conversion Rate <SourceTag>DB</SourceTag></td>
                <td className="px-4 py-3 text-gray-700">{lb.old.leads > 0 ? pct(lb.old.bookings, lb.old.leads) : '—'}</td>
                <td className="px-4 py-3 text-gray-700">{lb.new.leads > 0 ? pct(lb.new.bookings, lb.new.leads) : '—'}</td>
                <td className="px-4 py-3 text-gray-500">—</td>
              </tr>
            </tbody>
          </table>
        </div>
        {lb.historicalUnavailable.leads + lb.historicalUnavailable.bookings > 0 && (
          <div className="px-5 py-2.5 bg-gray-50/50 text-[11px] text-gray-500">
            {lb.historicalUnavailable.leads + lb.historicalUnavailable.bookings} lead/booking record{lb.historicalUnavailable.leads + lb.historicalUnavailable.bookings === 1 ? '' : 's'} from before domain tracking shipped are excluded above as <strong>historical — unavailable</strong>, not counted toward either domain.
          </div>
        )}
      </div>

      {/* B — Traffic source comparison */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm font-bold text-[#0B2560] mb-1">New Domain — Traffic Sources <SourceTag>GA4</SourceTag></p>
          {data.channelBreakdown && data.channelBreakdown.length > 0 ? (
            <div className="mt-3">
              <DonutChart
                size={110}
                segments={data.channelBreakdown.slice(0, 6).map((c, i) => ({
                  value: c.sessions, label: c.channel,
                  color: ['#0B2560', '#3B82C4', '#F5A623', '#10B981', '#8B5CF6', '#EC4899'][i % 6],
                }))}
              />
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-6 text-center">{cfg.ga4Configured ? 'No sessions in this window yet.' : 'Connect GA4 to see real channel data here.'}</p>
          )}
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm font-bold text-[#0B2560] mb-1">Old Domain — Organic Search <SourceTag>GSC</SourceTag></p>
          {data.gsc?.old.configured ? (
            <div className="mt-3 space-y-2 text-xs text-gray-600">
              <div className="flex justify-between"><span>Impressions</span><span className="font-bold text-gray-900">{data.gsc.old.totals.impressions.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Clicks</span><span className="font-bold text-gray-900">{data.gsc.old.totals.clicks.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Avg. CTR</span><span className="font-bold text-gray-900">{(data.gsc.old.totals.ctr * 100).toFixed(1)}%</span></div>
              <div className="flex justify-between"><span>Avg. position</span><span className="font-bold text-gray-900">{data.gsc.old.totals.position.toFixed(1)}</span></div>
              <p className="text-[10px] text-gray-400 pt-1">The old domain has no GA4 traffic by design (its tag never fires post-redirect) — Search Console's own property is the only real signal for its remaining organic presence.</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-6 text-center">Register the old domain as its own Search Console property, then add its site URL in Settings → Analytics.</p>
          )}
        </div>
      </div>

      {/* C — Old URL traffic */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <p className="text-sm font-bold text-[#0B2560]">Old URLs Still Receiving Traffic <SourceTag>GSC</SourceTag></p>
        </div>
        {data.oldUrls && data.oldUrls.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  {['Old URL', 'Impressions', 'Clicks', 'Redirect'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.oldUrls.map((u, i) => (
                  <tr key={i} className={u.redirectStatus === 'broken' ? 'bg-red-50/50' : ''}>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-700 max-w-[280px] truncate flex items-center gap-1.5">
                      {u.page} <ExternalLink size={10} className="text-gray-300 shrink-0" />
                    </td>
                    <td className="px-4 py-3 text-gray-700">{u.impressions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700">{u.clicks.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {u.redirectStatus === 'ok' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">200 · correct</span>}
                      {u.redirectStatus === 'broken' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700">Flagged</span>}
                      {u.redirectStatus === 'unchecked' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Not checked</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-8">{cfg.gscOldConfigured ? 'No old-domain pages with search visibility in this window.' : 'Connect the old domain\'s Search Console property to see this.'}</p>
        )}
      </div>

      {/* D — Trend */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <p className="text-sm font-bold text-[#0B2560]">Migration Trend — Leads &amp; Bookings <SourceTag>DB</SourceTag></p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                {['Month', 'Old Leads', 'New Leads', 'Old Bookings', 'New Bookings'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(data.trend || []).map((t, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 font-medium text-gray-800">{t.period}</td>
                  <td className="px-4 py-3 text-gray-700">{t.oldLeads}</td>
                  <td className="px-4 py-3 text-gray-700">{t.newLeads}</td>
                  <td className="px-4 py-3 text-gray-700">{t.oldBookings}</td>
                  <td className="px-4 py-3 text-gray-700">{t.newBookings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2.5 bg-gray-50/50 text-[11px] text-gray-500">
          Traffic-share trend (vs. just leads/bookings) will appear here once GA4's old-domain-tagged custom dimension is live — see the setup notice above.
        </div>
      </div>

      {/* F — URL redirect mapping (sitemap import → review → approve) */}
      <RedirectMappingsPanel />
    </div>
  );
}
