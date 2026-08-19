'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Eye, ExternalLink, Loader, Rocket, Copy } from 'lucide-react';

interface LandingPageRow {
  _id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  template: string;
  city: string;
  analytics: { visitors: number; leads: number };
  createdAt: string;
}

function conversionPct(visitors: number, leads: number): string {
  if (!visitors) return '—';
  return `${((leads / visitors) * 100).toFixed(1)}%`;
}

const TEMPLATE_LABELS: Record<string, string> = {
  'hair-prp': 'Hair PRP',
  'hydra-facial': 'Hydra Facial',
  'acne': 'Acne',
  'botox': 'Botox',
  'laser': 'Laser',
  'festival': 'Festival',
  'branch-opening': 'Branch Opening',
  'doctor-campaign': 'Doctor Campaign',
};

// Same 4-city set used sitewide — lets an admin filter the list down to
// "just the Chennai copy of this campaign" and read its own real
// Visitors/Leads straight off the existing columns, no new aggregation.
const CITY_LABELS: Record<string, string> = {
  chennai: 'Chennai',
  bangalore: 'Bangalore',
  coimbatore: 'Coimbatore',
  kochi: 'Kochi',
};

export default function LandingPagesAdminPage() {
  const router = useRouter();
  const [pages, setPages] = useState<LandingPageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [status, setStatus] = useState<'' | 'draft' | 'published'>('');
  const [template, setTemplate] = useState('');
  const [city, setCity] = useState('');

  // Fetch the full (small, campaign-scale) landing-page list once —
  // status/template used to each trigger their own fresh server round trip
  // on every click.
  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/landing-pages');
      const data = await res.json();
      if (data.success) setPages(data.data);
    } catch (error) {
      console.error('Error fetching landing pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPages = useMemo(() => {
    return pages.filter((p) => {
      if (status && p.status !== status) return false;
      if (template && p.template !== template) return false;
      if (city && p.city !== city) return false;
      return true;
    });
  }, [pages, status, template, city]);

  // Clones the page's content into a new draft, then jumps straight into
  // editing it — the common case is "same campaign page, only a couple of
  // details change," so landing on the edit screen for the new copy
  // (rather than back on the list) skips a click every time.
  const duplicatePage = async (id: string) => {
    setDuplicating(id);
    try {
      const res = await fetch(`/api/admin/landing-pages/${id}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        router.push(`/admin/landing-pages/${data.data._id}`);
      } else {
        alert(data.message || 'Duplicate failed');
      }
    } catch {
      alert('Network error — duplicate failed');
    } finally {
      setDuplicating(null);
    }
  };

  const deletePage = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/landing-pages/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPages((prev) => prev.filter((p) => p._id !== id));
      } else {
        alert(data.message || 'Delete failed');
      }
    } catch {
      alert('Network error — delete failed');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Rocket className="text-[#3B82C4]" size={28} />
            Landing Pages
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Build campaign landing pages for Google Ads, WhatsApp, and social media.
          </p>
        </div>
        <Link href="/admin/landing-pages/new">
          <button className="flex gap-2 items-center bg-[#0B2560] text-white px-6 py-2.5 rounded-xl hover:bg-[#1a3a7a] transition font-semibold shadow-lg shadow-[#0B2560]/20">
            <Plus size={18} />
            New Landing Page
          </button>
        </Link>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {(['', 'draft', 'published'] as const).map((v) => (
            <button
              key={v || 'all'}
              onClick={() => setStatus(v)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition capitalize ${
                status === v ? 'bg-white text-[#0B2560] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {v || 'All'}
            </button>
          ))}
        </div>
        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
        >
          <option value="">All Templates</option>
          {Object.entries(TEMPLATE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          title="Filter by city — compare Visitors/Leads across city-duplicated copies of a campaign"
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
        >
          <option value="">All Cities</option>
          {Object.entries(CITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {(status || template || city) && (
          <button
            onClick={() => { setStatus(''); setTemplate(''); setCity(''); }}
            className="text-xs text-gray-400 hover:text-[#0B2560] font-semibold underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader className="w-8 h-8 text-[#3B82C4] animate-spin" />
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-5xl mb-4">🚀</div>
          <p className="text-gray-700 font-bold text-lg mb-2">
            {status || template || city ? 'No landing pages match these filters' : 'No landing pages yet'}
          </p>
          <p className="text-gray-400 text-sm mb-6">
            {status || template || city
              ? 'Try clearing a filter to see more pages.'
              : 'Create your first landing page to start capturing leads from ads.'}
          </p>
          {status || template || city ? (
            <button
              onClick={() => { setStatus(''); setTemplate(''); setCity(''); }}
              className="bg-gray-100 text-gray-600 px-6 py-2.5 rounded-xl hover:bg-gray-200 font-semibold transition"
            >
              Clear filters
            </button>
          ) : (
            <Link href="/admin/landing-pages/new">
              <button className="bg-[#0B2560] text-white px-6 py-2.5 rounded-xl hover:bg-[#1a3a7a] font-semibold transition">
                Create First Landing Page
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Page
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Template
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Visitors
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Leads
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Conv.
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPages.map((page) => (
                <tr key={page._id} className="hover:bg-[#f6faff] transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-[#0B2560] text-sm flex items-center gap-2">
                        {page.title}
                        {page.city && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#3B82C4] bg-[#3B82C4]/10 px-1.5 py-0.5 rounded">
                            {CITY_LABELS[page.city] || page.city}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">/lp/{page.slug}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                      {TEMPLATE_LABELS[page.template] || page.template}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        page.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {page.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-gray-600 hidden lg:table-cell">
                    {(page.analytics?.visitors ?? 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-[#0B2560] hidden lg:table-cell">
                    {(page.analytics?.leads ?? 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right hidden lg:table-cell">
                    <span
                      className={`text-sm font-bold ${
                        parseFloat(conversionPct(page.analytics?.visitors, page.analytics?.leads)) > 3
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {conversionPct(page.analytics?.visitors ?? 0, page.analytics?.leads ?? 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={`/lp/${page.slug}${page.status !== 'published' ? '?preview=1' : ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={page.status === 'published' ? 'View live page' : 'Preview draft'}
                      >
                        <button className="p-2 text-[#3B82C4] hover:bg-[#3B82C4]/10 rounded-lg transition">
                          <ExternalLink size={16} />
                        </button>
                      </a>
                      <Link href={`/admin/landing-pages/${page._id}`}>
                        <button className="p-2 text-[#0B2560] hover:bg-[#0B2560]/10 rounded-lg transition">
                          <Edit size={16} />
                        </button>
                      </Link>
                      <button
                        onClick={() => duplicatePage(page._id)}
                        disabled={duplicating === page._id}
                        title="Duplicate — same content, new draft to tweak"
                        className="p-2 text-[#3B82C4] hover:bg-[#3B82C4]/10 rounded-lg transition disabled:opacity-50"
                      >
                        {duplicating === page._id ? (
                          <Loader size={16} className="animate-spin" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => deletePage(page._id, page.title)}
                        disabled={deleting === page._id}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      >
                        {deleting === page._id ? (
                          <Loader size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
