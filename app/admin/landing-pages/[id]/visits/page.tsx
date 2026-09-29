'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader, Monitor, Smartphone, Tablet, HelpCircle } from 'lucide-react';

interface Visit {
  _id: string;
  source: string;
  medium: string;
  campaign: string;
  referrer: string;
  device: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  createdAt: string;
}

interface VisitsData {
  landingPage: { title: string; slug: string; totalVisitors: number };
  visits: Visit[];
  total: number;
  page: number;
  totalPages: number;
}

const DEVICE_ICON: Record<Visit['device'], any> = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
  unknown: HelpCircle,
};

function sourceLabel(v: Visit): string {
  if (!v.source) return 'Direct / Organic';
  return v.medium ? `${v.source} / ${v.medium}` : v.source;
}

export default function LandingPageVisitsPage() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<VisitsData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/landing-pages/${id}/visits?page=${page}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, [id, page]);

  return (
    <div className="min-h-screen bg-[#f6faff]">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <Link href={`/admin/landing-pages/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0B2560] transition mb-6">
          <ArrowLeft size={14} /> Back to landing page
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0B2560]">
            Visitors{data ? ` — ${data.landingPage.title}` : ''}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {data ? `/lp/${data.landingPage.slug}` : ''}
            {data ? ` · ${data.landingPage.totalVisitors.toLocaleString()} visitors total` : ''}
          </p>
          <p className="text-xs text-gray-400 mt-2 max-w-2xl">
            Each row is one real visit to this page. Kept for 180 days — the totals above stay accurate after that,
            only this list ages out. IP addresses aren’t stored, only enough to attribute where traffic came from.
          </p>
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <Loader size={24} className="animate-spin text-gray-300" />
          </div>
        ) : !data || data.visits.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-400">
            No visits recorded yet.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3 hidden md:table-cell">Campaign</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Referrer</th>
                  <th className="px-5 py-3 text-right">Device</th>
                </tr>
              </thead>
              <tbody>
                {data.visits.map((v) => {
                  const Icon = DEVICE_ICON[v.device] || HelpCircle;
                  return (
                    <tr key={v._id} className="border-b border-gray-50 last:border-0 hover:bg-[#f6faff]/50">
                      <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(v.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="px-5 py-3 font-semibold text-[#0B2560]">{sourceLabel(v)}</td>
                      <td className="px-5 py-3 text-gray-500 hidden md:table-cell">{v.campaign || '—'}</td>
                      <td className="px-5 py-3 text-gray-400 hidden lg:table-cell truncate max-w-[220px]" title={v.referrer}>
                        {v.referrer || '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Icon size={15} className="inline-block text-gray-400" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between mt-5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-sm font-semibold text-gray-500 hover:text-[#0B2560] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Newer
            </button>
            <p className="text-xs text-gray-400">Page {data.page} of {data.totalPages} · {data.total.toLocaleString()} logged visits</p>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="text-sm font-semibold text-gray-500 hover:text-[#0B2560] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Older →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
