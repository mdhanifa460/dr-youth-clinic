'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { HeartPulse, AlertTriangle, ImageOff, UserCheck, Link2Off } from 'lucide-react';

function StatCard({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <p className={`text-2xl font-bold ${warn && value > 0 ? 'text-amber-600' : 'text-[#0B2560]'}`}>{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function Panel({ icon, title, subtitle, children, empty }: {
  icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode; empty: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[#0B2560]">{icon}</span>
        <h2 className="text-sm font-bold text-[#0B2560]">{title}</h2>
      </div>
      <p className="text-[11px] text-gray-400 mb-4">{subtitle}</p>
      {empty ? (
        <p className="text-xs text-emerald-600 font-medium">✓ Nothing to fix here.</p>
      ) : children}
    </div>
  );
}

export default function ContentHealthPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/content-health').then(r => r.json()).then(d => { if (d.success) setData(d.data); });
  }, []);

  if (!data) return <p className="text-xs text-gray-400 text-center py-16">Loading…</p>;

  const c = data.counts;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0B2560] flex items-center gap-2"><HeartPulse size={20} /> Content Health</h1>
        <p className="text-gray-400 text-sm mt-0.5">Thin records and coverage gaps, computed from what's already in the CMS — nothing here needs a new integration to fix.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Services need SEO work" value={c.thinServices} warn />
        <StatCard label="Doctor profiles incomplete" value={c.incompleteDoctors} warn />
        <StatCard label="Blog posts not doctor-reviewed" value={c.unreviewedBlogs} warn />
        <StatCard label="Services with no linked content" value={c.contentGapServices} warn />
      </div>

      <Panel
        icon={<AlertTriangle size={15} />}
        title="Services Needing SEO Work"
        subtitle="SEO completeness score below 50 — missing meta title, description, or on-page content."
        empty={data.thinServices.length === 0}
      >
        <div className="space-y-1.5">
          {data.thinServices.map((s: any) => (
            <Link key={s.id} href="/admin/services" className="flex items-center justify-between py-1.5 text-sm hover:text-[#0B2560] border-b border-gray-50">
              <span className="text-gray-700">{s.name}</span>
              <span className="text-amber-600 font-semibold text-xs">{s.seoScore}/100</span>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel
        icon={<ImageOff size={15} />}
        title="Incomplete Doctor Profiles"
        subtitle="Missing a photo, bio, or qualifications — all shown publicly on the doctor's page."
        empty={data.incompleteDoctors.length === 0}
      >
        <div className="space-y-1.5">
          {data.incompleteDoctors.map((d: any) => (
            <Link key={d.id} href="/admin/doctors" className="flex items-center justify-between py-1.5 text-sm hover:text-[#0B2560] border-b border-gray-50">
              <span className="text-gray-700">{d.name}</span>
              <span className="text-amber-600 text-xs">{d.missing.join(', ')}</span>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel
        icon={<UserCheck size={15} />}
        title="Blog Posts Not Doctor-Reviewed"
        subtitle="No reviewing doctor attached — affects both patient trust and the E-E-A-T signal search engines look for on medical content."
        empty={data.unreviewedBlogs.length === 0}
      >
        <div className="space-y-1.5">
          {data.unreviewedBlogs.map((b: any) => (
            <Link key={b.id} href="/admin/blog" className="block py-1.5 text-sm text-gray-700 hover:text-[#0B2560] border-b border-gray-50">
              {b.title}
            </Link>
          ))}
        </div>
      </Panel>

      <Panel
        icon={<Link2Off size={15} />}
        title="Services With No Supporting Content"
        subtitle="No published video, before/after result, or FAQ linked to this service — patients researching it have nothing beyond the service page itself."
        empty={data.contentGapServices.length === 0}
      >
        <div className="space-y-1.5">
          {data.contentGapServices.map((s: any) => (
            <Link key={s.id} href="/admin/services" className="flex items-center justify-between py-1.5 text-sm hover:text-[#0B2560] border-b border-gray-50">
              <span className="text-gray-700">{s.name}</span>
              <span className="text-gray-400 text-xs">{s.category}</span>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
