'use client';

// Shared chrome for the three Intelligence pages (Business/Marketing/AI) —
// extracted from what used to be one 14-section page under a single "AI
// Intelligence" label. Business Intelligence, Marketing Intelligence, and
// AI Intelligence are three different kinds of thing (facts about
// operations, facts about acquisition/marketing, and AI-generated
// insight/recommendation respectively) and now have their own routes,
// but the sidebar-nav-plus-content-panel chrome they share is identical,
// so it lives here once instead of three times.
import { useState, useEffect } from 'react';

export interface IntelligenceNavItem {
  id: string;
  label: string;
  icon: string;
  group: string;
}

function SectionSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 bg-gray-200 rounded-xl w-48" />
      <div className="h-3 bg-gray-100 rounded w-72" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-2xl h-24" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4 mt-2">
        <div className="bg-gray-100 rounded-2xl h-48" />
        <div className="bg-gray-100 rounded-2xl h-48" />
      </div>
    </div>
  );
}

function DataSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-xl w-56 mb-2" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-2xl h-24" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gray-100 rounded-2xl h-52" />
        <div className="bg-gray-100 rounded-2xl h-52" />
      </div>
    </div>
  );
}

type Period = 'Today' | '7 Days' | '30 Days' | 'Quarter';
const PERIODS: Period[] = ['Today', '7 Days', '30 Days', 'Quarter'];

type Branch = 'all' | 'chennai' | 'bangalore' | 'coimbatore' | 'kochi';
const BRANCHES: [Branch, string][] = [
  ['all', 'All Branches'],
  ['chennai', 'Chennai'],
  ['bangalore', 'Bangalore'],
  ['coimbatore', 'Coimbatore'],
  ['kochi', 'Kochi'],
];

export default function IntelligenceShell({
  eyebrow,
  title,
  subtitle,
  groups,
  navItems,
  sections,
  defaultActive,
  showAlertBadge = false,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  groups: string[];
  navItems: IntelligenceNavItem[];
  sections: Record<string, React.ComponentType<{ data: any }>>;
  defaultActive: string;
  // Only the AI Intelligence page carries Alerts Center — the red count
  // badge only makes sense where that section actually lives.
  showAlertBadge?: boolean;
}) {
  const [active, setActive]   = useState(defaultActive);
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30 Days');
  const [selectedBranch, setSelectedBranch] = useState<Branch>('all');

  const fetchData = async (branch: Branch) => {
    setLoading(true);
    setError('');
    try {
      // Shared endpoint across all three pages for now — it already computes
      // everything in one pass, so splitting it per-page is a later
      // optimization, not a correctness requirement of this reorg.
      const res  = await fetch(`/api/admin/intelligence?branch=${branch}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setData(json);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    } catch (e: any) {
      setError(e.message || 'Failed to load intelligence data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(selectedBranch); }, [selectedBranch]);

  const ActiveSection = sections[active];
  const activeNav     = navItems.find(n => n.id === active);
  const criticalCount = showAlertBadge ? (data?.alerts?.filter((a: any) => a.priority === 'critical').length || 0) : 0;

  return (
    <div className="flex h-full min-h-0 -m-6">
      {/* ── Sidebar overlay (mobile) ─────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className={`fixed lg:static z-50 top-0 left-0 h-full lg:h-auto w-64 bg-white border-r border-gray-100 flex flex-col transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Sidebar header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-xs font-bold text-[#0B2560] uppercase tracking-wider">{eyebrow}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{title}</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {groups.map(group => (
            <div key={group} className="mb-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gray-400 px-2 mb-1">{group}</p>
              {navItems.filter(n => n.group === group).map(item => {
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActive(item.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl mb-0.5 text-left transition-all ${
                      isActive
                        ? 'bg-[#0B2560] text-white font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-[#0B2560]'
                    }`}
                  >
                    <span className="text-base shrink-0">{item.icon}</span>
                    <span className="text-xs font-medium truncate">{item.label}</span>
                    {item.id === 'alerts' && criticalCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                        {criticalCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Last updated */}
        <div className="px-5 py-3 border-t border-gray-100 shrink-0">
          <p className="text-[10px] text-gray-400">
            {lastUpdated ? `Updated ${lastUpdated}` : 'Loading…'}
          </p>
          <button onClick={() => fetchData(selectedBranch)} disabled={loading}
            className="mt-1 text-[10px] font-semibold text-[#3B82C4] hover:underline disabled:opacity-40">
            ↻ Refresh data
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600"
          >☰</button>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#0B2560] truncate">
              {activeNav?.icon} {activeNav?.label}
            </p>
            <p className="text-[10px] text-gray-400 hidden sm:block">DR Youth Clinic · {subtitle}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Branch selector — scopes every panel's numbers to one clinic
                (except Clinic Performance's branch-comparison table, which
                always shows all branches by design). */}
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value as Branch)}
              disabled={loading}
              className="text-[11px] font-semibold text-[#0B2560] bg-gray-100 rounded-lg px-2 py-1.5 border-none focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 disabled:opacity-50"
            >
              {BRANCHES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>

            {/* Period selector */}
            <div className="hidden sm:flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg">
              {PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    selectedPeriod === p
                      ? 'bg-white text-[#0B2560] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {criticalCount > 0 && (
              <button onClick={() => setActive('alerts')}
                className="flex items-center gap-1 bg-red-50 text-red-700 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-red-200 hover:bg-red-100 transition">
                🚨 {criticalCount} alert{criticalCount > 1 ? 's' : ''}
              </button>
            )}
            <button onClick={() => fetchData(selectedBranch)} disabled={loading}
              className={`w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition ${loading ? 'animate-spin' : ''}`}
              title="Refresh">
              ↻
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-5 lg:p-6">
          {loading && !data ? (
            <DataSkeleton />
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <span className="text-3xl">⚠️</span>
              <p className="text-sm font-bold text-red-800 mt-2">Failed to load intelligence data</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
              <button onClick={() => fetchData(selectedBranch)} className="mt-4 text-xs font-bold text-red-700 bg-red-100 px-4 py-2 rounded-xl hover:bg-red-200 transition">
                Retry
              </button>
            </div>
          ) : (
            <ActiveSection data={{ ...data, selectedPeriod, selectedBranch }} />
          )}
        </div>
      </main>
    </div>
  );
}

export { SectionSkeleton };
