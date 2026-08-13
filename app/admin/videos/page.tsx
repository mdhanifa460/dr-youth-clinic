'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Star, Loader, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { FaYoutube, FaInstagram } from 'react-icons/fa';

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
  platform?: 'youtube' | 'instagram';
  createdAt: string;
}

interface YoutubeStatus {
  connected: boolean;
  hasApiKey: boolean;
  hasChannelId: boolean;
  message: string;
  channel?: { title: string; videoCount: string | number | null; subscriberCount: string | number | null };
}

function PlatformIcon({ platform }: { platform?: 'youtube' | 'instagram' }) {
  if (platform === 'instagram') {
    return (
      <span className="inline-flex items-center justify-center rounded p-0.5 bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 shrink-0">
        <FaInstagram size={9} className="text-white" />
      </span>
    );
  }
  return <FaYoutube size={14} className="text-red-600 shrink-0" />;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [statusTouched, setStatusTouched] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [igSyncing, setIgSyncing] = useState(false);
  const [igSyncMessage, setIgSyncMessage] = useState('');
  const [ytStatus, setYtStatus] = useState<YoutubeStatus | null>(null);
  const [ytStatusLoading, setYtStatusLoading] = useState(true);

  // Fetch the full (small, curated) video library once — the category
  // filter used to re-fetch from the server on every dropdown change even
  // though it's just filtering this same small list.
  useEffect(() => { fetchVideos(); checkYoutubeStatus(); }, []);

  async function checkYoutubeStatus() {
    setYtStatusLoading(true);
    try {
      const res = await fetch('/api/admin/videos/youtube-status');
      const data = await res.json();
      if (data.success) setYtStatus(data);
    } catch {
      setYtStatus({ connected: false, hasApiKey: false, hasChannelId: false, message: 'Could not check connection — network error.' });
    } finally {
      setYtStatusLoading(false);
    }
  }

  async function fetchVideos() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/videos');
      const data = await res.json();
      if (data.success) {
        setVideos(data.data);
        // Default the Status filter to Draft so new syncs surface
        // immediately — but only on first load, never overriding a
        // selection the admin already made (e.g. after a sync refetch).
        if (!statusTouched && data.data.some((v: VideoRow) => v.status === 'draft')) {
          setStatus('draft');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  function changeStatus(v: string) {
    setStatusTouched(true);
    setStatus(v);
  }

  const draftCount = useMemo(() => videos.filter((v) => v.status === 'draft').length, [videos]);

  async function syncFromYoutube() {
    setSyncing(true);
    setSyncMessage('');
    try {
      const res = await fetch('/api/admin/videos/sync-youtube', { method: 'POST' });
      const data = await res.json();
      setSyncMessage(data.message || (data.success ? 'Sync complete.' : 'Sync failed.'));
      if (data.success && data.added > 0) await fetchVideos();
      if (!data.success) checkYoutubeStatus();
    } catch {
      setSyncMessage('Sync failed — network error.');
    } finally {
      setSyncing(false);
    }
  }

  async function syncFromInstagram() {
    setIgSyncing(true);
    setIgSyncMessage('');
    try {
      const res = await fetch('/api/admin/videos/sync-instagram', { method: 'POST' });
      const data = await res.json();
      setIgSyncMessage(data.message || (data.success ? 'Sync complete.' : 'Sync failed.'));
      if (data.success && data.added > 0) await fetchVideos();
    } catch {
      setIgSyncMessage('Sync failed — network error.');
    } finally {
      setIgSyncing(false);
    }
  }

  const filteredVideos = useMemo(
    () => videos.filter((v) => (category ? v.category === category : true) && (status ? v.status === status : true)),
    [videos, category, status]
  );

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
        <div className="flex items-center gap-2">
          <button
            onClick={syncFromYoutube}
            disabled={syncing || ytStatusLoading || ytStatus?.connected === false}
            title={ytStatus?.connected === false ? ytStatus.message : undefined}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-[#0B2560] px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 transition disabled:opacity-50"
          >
            {syncing ? <Loader size={15} className="animate-spin" /> : <FaYoutube size={15} className="text-red-600" />}
            Sync from YouTube
          </button>
          <button
            onClick={syncFromInstagram}
            disabled={igSyncing}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-[#0B2560] px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 transition disabled:opacity-50"
          >
            {igSyncing ? <Loader size={15} className="animate-spin" /> : <FaInstagram size={15} className="text-pink-600" />}
            Sync from Instagram
          </button>
          <Link href="/admin/videos/new"
            className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition">
            <Plus size={15} /> Add Video
          </Link>
        </div>
      </div>

      <div className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
        ytStatusLoading ? 'bg-gray-50 border-gray-100 text-gray-400'
        : ytStatus?.connected ? 'bg-green-50 border-green-100 text-green-700'
        : 'bg-amber-50 border-amber-100 text-amber-700'
      }`}>
        <span className="flex items-center gap-2">
          {ytStatusLoading ? (
            <Loader size={13} className="animate-spin shrink-0" />
          ) : ytStatus?.connected ? (
            <CheckCircle2 size={14} className="shrink-0" />
          ) : (
            <AlertTriangle size={14} className="shrink-0" />
          )}
          {ytStatusLoading
            ? 'Checking YouTube connection…'
            : ytStatus?.connected
              ? `YouTube connected — ${ytStatus.channel?.title} (${ytStatus.channel?.videoCount ?? '?'} videos on channel)`
              : ytStatus?.message || 'YouTube not connected.'}
        </span>
        <button
          onClick={checkYoutubeStatus}
          disabled={ytStatusLoading}
          className="inline-flex items-center gap-1 shrink-0 text-[11px] font-bold underline underline-offset-2 hover:opacity-70 disabled:opacity-40"
        >
          <RefreshCw size={11} /> Test Connection
        </button>
      </div>

      {syncMessage && (
        <p className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">{syncMessage}</p>
      )}
      {igSyncMessage && (
        <p className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">{igSyncMessage}</p>
      )}

      <div className="flex items-center gap-4">
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
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">Status</label>
          <select
            value={status}
            onChange={(e) => changeStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
          >
            <option value="">All</option>
            <option value="draft">Draft{draftCount > 0 ? ` (${draftCount})` : ''}</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader className="animate-spin text-gray-300" size={24} /></div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">🎬</p>
          <p className="text-gray-500 font-semibold">
            {category || status
              ? `No ${status || ''} videos${category ? ` in "${category}"` : ''} yet.`
              : 'No videos yet — add your first one.'}
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
              {filteredVideos.map((v) => (
                <tr key={v._id} className={`hover:bg-gray-50/50 ${v.status === 'draft' ? 'bg-[#FFFBF0] border-l-2 border-l-[#F5A623]' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        {v.thumbnail?.url ? (
                          <img src={v.thumbnail.url} alt="" className="w-16 h-10 object-cover rounded-lg" />
                        ) : (
                          <div className="w-16 h-10 bg-gray-100 rounded-lg" />
                        )}
                        <div className="absolute -bottom-1 -right-1 bg-white rounded p-0.5 shadow-sm">
                          <PlatformIcon platform={v.platform} />
                        </div>
                      </div>
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
