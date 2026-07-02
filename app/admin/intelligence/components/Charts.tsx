'use client';

// ── SparkLine ────────────────────────────────────────────────────────────────
export function SparkLine({
  data, color = '#0B2560', height = 44, fill = false,
}: { data: number[]; color?: string; height?: number; fill?: boolean }) {
  if (!data || data.length < 2) return <div style={{ height }} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const rng = max - min || 1;
  const W = 120; const H = height;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * W},${H - ((v - min) / rng) * (H - 4) - 2}`
  );
  const d = `M ${pts.join(' L ')}`;
  const fillPath = `${d} L ${W},${H} L 0,${H} Z`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      {fill && <path d={fillPath} fill={color} fillOpacity={0.1} />}
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── BarChart ─────────────────────────────────────────────────────────────────
export function BarChart({
  data, color = '#0B2560', maxH = 80, showLabels = true,
}: {
  data: { label: string; value: number; color?: string }[];
  color?: string; maxH?: number; showLabels?: boolean;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <div
            className="w-full rounded-t-md transition-all duration-700"
            style={{ height: `${Math.max(4, (d.value / max) * maxH)}px`, backgroundColor: d.color || color }}
          />
          {showLabels && (
            <span className="text-[9px] text-gray-400 truncate w-full text-center">{d.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── HBarChart (horizontal) ───────────────────────────────────────────────────
export function HBarChart({
  data, color = '#0B2560',
}: { data: { label: string; value: number; sub?: string; color?: string }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700 truncate max-w-[60%]">{d.label}</span>
            <span className="text-xs font-bold text-gray-900">{d.sub || d.value}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color || color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── DonutChart ───────────────────────────────────────────────────────────────
export function DonutChart({
  segments, size = 80, strokeW = 12,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number; strokeW?: number;
}) {
  const r   = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, g) => s + g.value, 0) || 1;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeW} />
        {segments.map((seg, i) => {
          const dash = (seg.value / total) * circ;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={seg.color} strokeWidth={strokeW}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="round" />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="space-y-1.5">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-gray-600">{s.label}</span>
            <span className="text-xs font-bold text-gray-900 ml-auto pl-2">
              {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ProgressBar ──────────────────────────────────────────────────────────────
export function ProgressBar({
  value, max = 100, color = '#0B2560', bg = '#e8eff7', label, showPct = true,
}: {
  value: number; max?: number; color?: string; bg?: string;
  label?: string; showPct?: boolean;
}) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div>
      {(label || showPct) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-xs text-gray-600">{label}</span>}
          {showPct && <span className="text-xs font-bold" style={{ color }}>{pct}%</span>}
        </div>
      )}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: bg }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({
  label, value, sub, trend, icon, color = '#0B2560', sparkData,
}: {
  label: string; value: string | number; sub?: string;
  trend?: 'up' | 'down' | 'neutral'; icon?: string;
  color?: string; sparkData?: number[];
}) {
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400';
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div>
          {icon && <span className="text-xl mb-1 block">{icon}</span>}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{value}</p>
          {sub && (
            <p className={`text-xs mt-0.5 font-medium ${trendColor}`}>
              {trendIcon} {sub}
            </p>
          )}
        </div>
        {sparkData && (
          <SparkLine data={sparkData} color={color} height={40} fill />
        )}
      </div>
    </div>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({
  title, subtitle, badge,
}: { title: string; subtitle?: string; badge?: string }) {
  return (
    <div className="mb-6">
      {badge && (
        <span className="inline-block text-[10px] font-bold tracking-[0.18em] uppercase text-[#F5A623] bg-[#F5A623]/10 px-3 py-1 rounded-full mb-2">
          {badge}
        </span>
      )}
      <h2 className="text-xl font-extrabold text-[#0B2560]">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// ── InsightCard ──────────────────────────────────────────────────────────────
export function InsightCard({
  icon, title, detail, pill, pillColor = 'bg-blue-50 text-blue-700',
}: {
  icon: string; title: string; detail: string; pill?: string; pillColor?: string;
}) {
  return (
    <div className="bg-[#f6faff] rounded-xl p-4 border border-[#e8eff7]">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-[#0B2560]">{title}</p>
            {pill && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${pillColor}`}>{pill}</span>}
          </div>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">{detail}</p>
        </div>
      </div>
    </div>
  );
}

// ── AlertBadge ───────────────────────────────────────────────────────────────
export function AlertBadge({ priority }: { priority: 'critical' | 'medium' | 'low' }) {
  const map = {
    critical: 'bg-red-100 text-red-700',
    medium:   'bg-amber-100 text-amber-700',
    low:      'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${map[priority]}`}>
      {priority}
    </span>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────
export const fmtINR = (n: number) => {
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return `₹${n}`;
};
