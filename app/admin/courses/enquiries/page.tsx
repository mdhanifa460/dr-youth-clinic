'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader, ChevronLeft, ChevronRight } from 'lucide-react';

interface EnquiryRow {
  _id: string;
  name: string;
  phone: string;
  email: string;
  practiceOrClinicName: string;
  city: string;
  message: string;
  status: 'new' | 'contacted' | 'enrolled' | 'declined';
  course?: { title: string; slug: string };
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-50 text-blue-600',
  contacted: 'bg-amber-50 text-amber-600',
  enrolled: 'bg-green-50 text-green-600',
  declined: 'bg-gray-100 text-gray-400',
};

export default function CourseEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { fetchEnquiries(); }, [page]);

  async function fetchEnquiries() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/course-enquiries?page=${page}`);
      const data = await res.json();
      if (data.success) {
        setEnquiries(data.data);
        setTotalPages(data.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(enquiryId: string, status: string) {
    setEnquiries((rows) => rows.map((r) => (r._id === enquiryId ? { ...r, status: status as EnquiryRow['status'] } : r)));
    await fetch('/api/admin/course-enquiries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enquiryId, status }),
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/courses" className="text-blue-600 hover:underline text-sm">
          ← Back to Certification Programs
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 mt-2">📩 Program Enquiries</h1>
        <p className="text-gray-500 text-sm mt-1">Practitioners who requested more information about a certification course.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader className="animate-spin text-gray-300" size={24} /></div>
      ) : enquiries.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500 font-semibold">No enquiries yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Course</th>
                <th className="text-left px-4 py-3">Practice / City</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {enquiries.map((e) => (
                <Fragment key={e._id}>
                  <tr className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setExpanded(expanded === e._id ? null : e._id)}>
                    <td className="px-4 py-3 font-semibold text-gray-700">{e.name}</td>
                    <td className="px-4 py-3 text-gray-500">{e.course?.title || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{[e.practiceOrClinicName, e.city].filter(Boolean).join(', ') || '—'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={e.status}
                        onClick={(ev) => ev.stopPropagation()}
                        onChange={(ev) => updateStatus(e._id, ev.target.value)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase border-0 focus:outline-none ${STATUS_STYLES[e.status]}`}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="enrolled">Enrolled</option>
                        <option value="declined">Declined</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{expanded === e._id ? '▲' : '▼'}</td>
                  </tr>
                  {expanded === e._id && (
                    <tr key={`${e._id}-detail`}>
                      <td colSpan={5} className="px-4 py-4 bg-gray-50/50 text-sm text-gray-600 space-y-1">
                        <p><span className="font-semibold text-gray-500">Phone:</span> {e.phone || '—'}</p>
                        <p><span className="font-semibold text-gray-500">Email:</span> {e.email || '—'}</p>
                        <p><span className="font-semibold text-gray-500">Message:</span> {e.message || '—'}</p>
                        <p className="text-xs text-gray-400">{new Date(e.createdAt).toLocaleString()}</p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 text-gray-400 hover:text-[#0B2560] disabled:opacity-30"><ChevronLeft size={16} /></button>
              <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 text-gray-400 hover:text-[#0B2560] disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
