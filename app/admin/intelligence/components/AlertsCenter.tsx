'use client';

import { SectionHeader } from './Charts';

const PRIORITY_CONFIG = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', icon: '🚨', badge: 'bg-red-100 text-red-700', label: 'Critical' },
  medium:   { bg: 'bg-amber-50', border: 'border-amber-200', icon: '⚠️', badge: 'bg-amber-100 text-amber-700', label: 'Medium' },
  low:      { bg: 'bg-blue-50', border: 'border-blue-200', icon: '💡', badge: 'bg-blue-100 text-blue-700', label: 'Low' },
};

// Generate smart hardcoded alerts based on real data
function buildAlerts(data: any): any[] {
  const base = data?.alerts || [];
  const o = data?.overview || {};
  const extra: any[] = [];

  // Always-present operational tips
  if (o.activeDoctors > 0 && o.activeClinics > 1) {
    extra.push({
      id: 'multi-clinic',
      type: 'operational',
      priority: 'low',
      message: `Running ${o.activeClinics} active clinic${o.activeClinics > 1 ? 's' : ''}`,
      detail: 'Ensure each branch has minimum coverage of 1 doctor per shift and consistent response time to WhatsApp enquiries.',
      action: 'Review Staffing',
    });
  }
  if ((o.totalReviews || 0) < 50) {
    extra.push({
      id: 'low-reviews',
      type: 'reputation',
      priority: 'medium',
      message: 'Review count below 50 — credibility threshold',
      detail: 'Clinics with 50+ reviews receive 3× more website clicks. Send post-appointment WhatsApp messages requesting Google reviews.',
      action: 'Launch Review Campaign',
    });
  }
  if ((o.activeServices || 0) < 10) {
    extra.push({
      id: 'few-services',
      type: 'growth',
      priority: 'low',
      message: `Only ${o.activeServices || 0} active services listed`,
      detail: 'Clinics with 15+ services rank higher on Google and attract a broader patient audience.',
      action: 'Add Services',
    });
  }

  return [...base, ...extra].sort((a, b) => {
    const order = { critical: 0, medium: 1, low: 2 };
    return order[a.priority as keyof typeof order] - order[b.priority as keyof typeof order];
  });
}

export default function AlertsCenter({ data }: { data: any }) {
  const allAlerts = buildAlerts(data);

  const critical = allAlerts.filter(a => a.priority === 'critical');
  const medium   = allAlerts.filter(a => a.priority === 'medium');
  const low      = allAlerts.filter(a => a.priority === 'low');

  const TYPE_ICONS: Record<string, string> = {
    operational: '⚙️',
    revenue:     '💰',
    retention:   '👥',
    reputation:  '⭐',
    growth:      '📈',
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Alerts Center"
        subtitle="Smart alerts generated from your live clinic data. Prioritised by business impact."
        badge="Live Alerts"
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Critical Alerts', count: critical.length, color: '#EF4444', bg: 'bg-red-50',   icon: '🚨' },
          { label: 'Medium Alerts',   count: medium.length,   color: '#F59E0B', bg: 'bg-amber-50', icon: '⚠️' },
          { label: 'Low Priority',    count: low.length,      color: '#3B82F6', bg: 'bg-blue-50',  icon: '💡' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-2xl p-4 text-center border ${s.count > 0 ? 'border-current' : 'border-transparent'}`}
            style={s.count > 0 ? { borderColor: s.color + '30' } : {}}>
            <span className="text-xl">{s.icon}</span>
            <p className="text-2xl font-extrabold mt-1" style={{ color: s.color }}>{s.count}</p>
            <p className="text-xs text-gray-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* All clear */}
      {allAlerts.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
          <span className="text-4xl">✅</span>
          <p className="text-base font-bold text-emerald-800 mt-3">All Clear!</p>
          <p className="text-sm text-emerald-600 mt-1">No alerts detected. Your clinic is operating well.</p>
        </div>
      )}

      {/* Critical */}
      {critical.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">🚨</span>
            <p className="text-sm font-bold text-red-700">Critical — Immediate Action Required</p>
          </div>
          {critical.map((alert, i) => {
            const cfg = PRIORITY_CONFIG.critical;
            return (
              <div key={i} className={`${cfg.bg} border ${cfg.border} rounded-2xl p-5`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{TYPE_ICONS[alert.type] || '⚙️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold text-red-900">{alert.message}</p>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-red-700 leading-relaxed">{alert.detail}</p>
                    <button className="mt-3 text-xs font-bold text-red-800 bg-red-200 hover:bg-red-300 transition px-3 py-1.5 rounded-lg">
                      → {alert.action}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Medium */}
      {medium.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">⚠️</span>
            <p className="text-sm font-bold text-amber-700">Medium — Address This Week</p>
          </div>
          {medium.map((alert, i) => {
            const cfg = PRIORITY_CONFIG.medium;
            return (
              <div key={i} className={`${cfg.bg} border ${cfg.border} rounded-2xl p-5`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{TYPE_ICONS[alert.type] || '⚙️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold text-amber-900">{alert.message}</p>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-amber-700 leading-relaxed">{alert.detail}</p>
                    <button className="mt-3 text-xs font-bold text-amber-800 bg-amber-200 hover:bg-amber-300 transition px-3 py-1.5 rounded-lg">
                      → {alert.action}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Low */}
      {low.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">💡</span>
            <p className="text-sm font-bold text-blue-700">Suggestions — Improve When Possible</p>
          </div>
          {low.map((alert, i) => {
            const cfg = PRIORITY_CONFIG.low;
            return (
              <div key={i} className={`${cfg.bg} border ${cfg.border} rounded-2xl p-5`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{TYPE_ICONS[alert.type] || '⚙️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold text-blue-900">{alert.message}</p>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-blue-700 leading-relaxed">{alert.detail}</p>
                    <button className="mt-3 text-xs font-bold text-blue-800 bg-blue-200 hover:bg-blue-300 transition px-3 py-1.5 rounded-lg">
                      → {alert.action}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
