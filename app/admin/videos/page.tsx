'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Star, Loader } from 'lucide-react';

// Mirrors VIDEO_CATEGORIES in app/models/Video.ts — not imported directly
// since that file pulls in mongoose, unsafe to bundle into a client component
// (same reason every other admin list page duplicates its enum locally).
const VIDEO_CATEGORIES = [
  'Hair', 'Skin', 'Laser', 'Botox', 'Acne', 'PRP', 'GFC',
  'Technology', 'Doctor Talks', 'Patient Stories', 'FAQ', 'Recovery', 'Lifestyle',
];

interface VideoRow {
  _id: string;
  title: string;
  category: string;
  duration?: string;
  featured: boolean;
  status: 'draft' | 'published';
  thumbnail?: { url: string };
  doctor?: { name: string };
  createdAt: string;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [category, setCategory] = useState('');

  useEffect(() => { fetchVideos(); }, [category]);

  async function fetchVideos() {
    try {
      setLoading(true);
      const qs = category ? `?category=${encodeURIComponent(category)}` : '';
      const res = await fetch(`/api/admin/videos${qs}`);
      const data = await res.json();
      if (data.success) setVideos(data.data);
    } finally {
      setLoading(false);
    }
  }

  async function deleteVideo(id: string) {
    if (!confirm('Delete this video?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/videos/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setVideos((v) => v.filter((x) => x._id !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">🎥 Video Academy</h1>
          <p className="text-gray-500 text-sm mt-1">Manage the Skin &amp; Hair Academy video library.</p>
        </div>
        <Link href="/admin/videos/new"
          className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition">
          <Plus size={15} /> Add Video
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-gray-500">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
        >
          <option value="">All Categories</option>
          {VIDEO_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader className="animate-spin text-gray-300" size={24} /></div>
      ) : videos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">🎬</p>
          <p className="text-gray-500 font-semibold">
            {category ? `No videos in "${category}" yet.` : 'No videos yet — add your first one.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Video</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Doctor</th>
                <th className="text-left px-4 py-3">Duration</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {videos.map((v) => (
                <tr key={v._id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {v.thumbnail?.url ? (
                        <img src={v.thumbnail.url} alt="" className="w-16 h-10 object-cover rounded-lg shrink-0" />
                      ) : (
                        <div className="w-16 h-10 bg-gray-100 rounded-lg shrink-0" />
                      )}
                      <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                        {v.featured && <Star size={12} className="text-[#F5A623] fill-[#F5A623]" />}
                        {v.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{v.category}</td>
                  <td className="px-4 py-3 text-gray-500">{v.doctor?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{v.duration || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${v.status === 'published' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/admin/videos/${v._id}`} className="p-1.5 text-gray-400 hover:text-[#0B2560] hover:bg-gray-100 rounded-lg transition">
                        <Edit size={14} />
                      </Link>
                      <button onClick={() => deleteVideo(v._id)} disabled={deleting === v._id}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-40">
                        <Trash2 size={14} />
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
