'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Edit2, Eye, EyeOff, BookOpen, Star } from 'lucide-react';

// ── Post card ──────────────────────────────────────────────────────────────
function PostCard({ post, onToggle, onToggleFeatured, onDelete }: {
  post: any;
  onToggle: (id: string, val: boolean) => void;
  onToggleFeatured: (id: string, val: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-3 shadow-sm transition ${
      !post.active ? 'opacity-60 border-dashed border-gray-300' : 'border-gray-100'
    }`}>
      {post.coverImage?.url && (
        <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-gray-100">
          <img src={post.coverImage.url} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[#3B82C4] uppercase tracking-wider mb-1">{post.category}</p>
          <p className="text-sm font-bold text-[#0B2560] leading-snug line-clamp-2">{post.title}</p>
        </div>
        <button onClick={() => onDelete(post._id)} className="text-gray-300 hover:text-red-500 transition shrink-0">
          <Trash2 size={13} />
        </button>
      </div>

      {post.excerpt && <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{post.excerpt}</p>}

      <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-400">
        <span className="bg-gray-100 px-2 py-0.5 rounded-full">{date}</span>
        <span className="bg-gray-100 px-2 py-0.5 rounded-full">{post.readTime}</span>
        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded-full truncate max-w-[120px]">{post.slug}</span>
      </div>

      <div className="flex items-center gap-1.5 pt-1 border-t border-gray-50">
        <button onClick={() => onToggle(post._id, !post.active)}
          className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full transition ${
            post.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
          {post.active ? <Eye size={10} /> : <EyeOff size={10} />}
          {post.active ? 'Live' : 'Draft'}
        </button>
        <button onClick={() => onToggleFeatured(post._id, !post.featured)}
          className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full transition ${
            post.featured ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-400'
          }`}>
          <Star size={10} /> {post.featured ? 'Featured' : 'Normal'}
        </button>
        <Link href={`/admin/blog/${post._id}`} className="ml-auto flex items-center gap-1 text-[10px] text-[#3B82C4] hover:text-[#0B2560] font-semibold transition">
          <Edit2 size={10} /> Edit
        </Link>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function BlogAdminPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blog');
      const d = await res.json();
      if (d.success) setPosts(d.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const toggle = async (id: string, val: boolean) => {
    setPosts((p) => p.map((x) => x._id === id ? { ...x, active: val } : x));
    await fetch(`/api/admin/blog/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: val }) });
  };

  const toggleFeatured = async (id: string, val: boolean) => {
    setPosts((p) => p.map((x) => x._id === id ? { ...x, featured: val } : x));
    await fetch(`/api/admin/blog/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ featured: val }) });
  };

  const deletePost = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    setPosts((p) => p.filter((x) => x._id !== id));
    await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2560] flex items-center gap-2"><BookOpen size={22} /> Blog Posts</h1>
          <p className="text-gray-500 text-sm mt-0.5">Write & manage articles shown on the homepage and /blog page.</p>
        </div>
        <Link href="/admin/blog/new" className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d2d73] transition">
          <Plus size={15} /> New Post
        </Link>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
              <div className="aspect-[16/9] rounded-xl bg-gray-200" />
              <div className="h-3 w-3/4 rounded bg-gray-200" />
              <div className="h-2.5 w-full rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">✍️</p>
          <p className="text-gray-500 font-semibold mb-1">No posts yet</p>
          <p className="text-gray-400 text-sm mb-6">Create your first blog post to appear on the website.</p>
          <Link href="/admin/blog/new" className="bg-[#0B2560] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0d2d73] transition">+ New Post</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((p) => (
            <PostCard key={p._id} post={p}
              onToggle={toggle} onToggleFeatured={toggleFeatured} onDelete={deletePost} />
          ))}
        </div>
      )}
    </div>
  );
}
