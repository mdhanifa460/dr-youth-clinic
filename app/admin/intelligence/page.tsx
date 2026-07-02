'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Lazy-load each section so only the active one hydrates
const SECTIONS: Record<string, React.ComponentType<{ data: any }>> = {
  overview:     dynamic(() => import('./components/ExecutiveOverview'),    { loading: () => <SectionSkeleton /> }),
  revenue:      dynamic(() => import('./components/RevenueIntelligence'),  { loading: () => <SectionSkeleton /> }),
  treatment:    dynamic(() => import('./components/TreatmentIntelligence'),{ loading: () => <SectionSkeleton /> }),
  patient:      dynamic(() => import('./components/PatientIntelligence'),  { loading: () => <SectionSkeleton /> }),
  doctor:       dynamic(() => import('./components/DoctorPerformance'),    { loading: () => <SectionSkeleton /> }),
  clinic:       dynamic(() => import('./components/ClinicPerformance'),    { loading: () => <SectionSkeleton /> }),
  marketing:    dynamic(() => import('./components/MarketingIntelligence'),{ loading: () => <SectionSkeleton /> }),
  seo:          dynamic(() => import('./components/SEOIntelligence'),      { loading: () => <SectionSkeleton /> }),
  geo:          dynamic(() => import('./components/GEOIntelligence'),      { loading: () => <SectionSkeleton /> }),
  competitor:   dynamic(() => import('./components/CompetitorIntelligence'),{ loading: () => <SectionSkeleton /> }),
  forecast:     dynamic(() => import('./components/Forecast'),             { loading: () => <SectionSkeleton /> }),
  ai:           dynamic(() => import('./components/AIAdvisor'),            { loading: () => <SectionSkeleton /> }),
  alerts:       dynamic(() => import('./components/AlertsCenter'),         { loading: () => <SectionSkeleton /> }),
  growth:       dynamic(() => import('./components/GrowthOpportunities'),  { loading: () => <SectionSkeleton /> }),
};

const NAV_ITEMS = [
  { id: 'overview',   label: 'Executive Overview',    icon: '📊', group: 'Overview'     },
  { id: 'alerts',     label: 'Alerts Center',         icon: '🚨', group: 'Overview'     },
  { id: 'ai',         label: 'AI Business Advisor',   icon: '🤖', group: 'Overview'     },
  { id: 'revenue',    label: 'Revenue Intelligence',  icon: '💰', group: 'Analytics'    },
  { id: 'treatment',  label: 'Treatment Intelligence',icon: '💊', group: 'Analytics'    },
  { id: 'patient',    label: 'Patient Intelligence',  icon: '👥', group: 'Analytics'    },
  { id: 'doctor',     label: 'Doctor Performance',    icon: '👨‍⚕️', group: 'Operations'  },
  { id: 'clinic',     label: 'Clinic Performance',    icon: '🏥', group: 'Operations'   },
  { id: 'marketing',  label: 'Marketing Intelligence',icon: '📱', group: 'Marketing'    },
  { id: 'seo',        label: 'SEO Intelligence',      icon: '🔍', group: 'Marketing'    },
  { id: 'geo',        label: 'GEO & AEO Intelligence',icon: '🌐', group: 'Marketing'    },
  { id: 'competitor', label: 'Competitor Intel',       icon: '🏆', group: 'Marketing'    },
  { id: 'forecast',   label: 'Forecast',              icon: '📈', group: 'Strategy'     },
  { id: 'growth',     label: 'Growth Opportunities',  icon: '🌱', group: 'Strategy'     },
];

const GROUPS = ['Overview', 'Analytics', 'Operations', 'Marketing', 'Strategy'];

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

export default function IntelligenceDashboard() {
  const [active, setActive]   = useState('overview');
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/admin/intelligence');
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

  useEffect(() => { fetchData(); }, []);

  const ActiveSection = SECTIONS[active];
  const activeNav     = NAV_ITEMS.find(n => n.id === active);
  const criticalCount = data?.alerts?.filter((a: any) => a.priority === 'critical').length || 0;

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
            <p className="text-xs font-bold text-[#0B2560] uppercase tracking-wider">AI Intelligence</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Business Dashboard</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {GROUPS.map(group => (
            <div key={group} className="mb-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gray-400 px-2 mb-1">{group}</p>
              {NAV_ITEMS.filter(n => n.group === group).map(item => {
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
          <button onClick={fetchData} disabled={loading}
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
            <p className="text-[10px] text-gray-400 hidden sm:block">DR Youth Clinic · AI Business Intelligence</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {criticalCount > 0 && (
              <button onClick={() => setActive('alerts')}
                className="flex items-center gap-1 bg-red-50 text-red-700 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-red-200 hover:bg-red-100 transition">
                🚨 {criticalCount} alert{criticalCount > 1 ? 's' : ''}
              </button>
            )}
            <button onClick={fetchData} disabled={loading}
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
              <button onClick={fetchData} className="mt-4 text-xs font-bold text-red-700 bg-red-100 px-4 py-2 rounded-xl hover:bg-red-200 transition">
                Retry
              </button>
            </div>
          ) : (
            <ActiveSection data={data} />
          )}
        </div>
      </main>
    </div>
  );
}
