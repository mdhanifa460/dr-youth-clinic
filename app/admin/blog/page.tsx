'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, X, Loader, CheckCircle, Trash2, Edit2, Eye, EyeOff, BookOpen, Star } from 'lucide-react';
import ImageUpload from '@/app/admin/components/ImageUpload';
import ContentBlockEditor from '@/app/admin/components/contentblocks/ContentBlockEditor';
import { markdownToBlocks } from '@/app/lib/contentBlocks/types';

const CATEGORIES = ['Hair Care', 'Skin Care', 'Laser', 'Aesthetics', 'General'];

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const EMPTY_FORM = {
  title: '', slug: '', excerpt: '', body: '', bodyBlocks: [] as any[],
  coverImage: { url: '', publicId: '' },
  category: 'General', tags: '', author: 'DR Youth Clinic Team',
  authorTitle: 'Medical Content Team', readTime: '5 min read',
  publishedAt: new Date().toISOString().split('T')[0],
  featured: false, active: true,
};

// ── Post card ──────────────────────────────────────────────────────────────
function PostCard({ post, onToggle, onToggleFeatured, onDelete, onEdit }: {
  post: any;
  onToggle: (id: string, val: boolean) => void;
  onToggleFeatured: (id: string, val: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (post: any) => void;
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
        <button onClick={() => onEdit(post)} className="ml-auto flex items-center gap-1 text-[10px] text-[#3B82C4] hover:text-[#0B2560] font-semibold transition">
          <Edit2 size={10} /> Edit
        </button>
      </div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────
function BlogModal({ initial, onClose, onSave }: {
  initial: any; onClose: () => void; onSave: (data: any) => Promise<void>;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleTitleChange = (v: string) => {
    set('title', v);
    if (!initial._id) set('slug', slugify(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        tags: typeof form.tags === 'string'
          ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : form.tags,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="font-bold text-[#0B2560]">{initial._id ? 'Edit Post' : 'New Post'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Cover Image */}
          <ImageUpload label="Cover Image" folder="dr-youth-clinic/blog" onUpload={(d) => set('coverImage', d)} />
          {form.coverImage?.url && (
            <div className="flex items-center gap-2 -mt-2">
              <img src={form.coverImage.url} alt="" className="w-16 h-10 rounded-lg object-cover" />
              <span className="text-xs text-gray-400">Current cover</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
            <input required value={form.title} onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="PRP Therapy: Complete Guide to Hair Restoration" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Slug * <span className="font-normal text-gray-400">(URL path)</span></label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 shrink-0">/blog/</span>
              <input required value={form.slug} onChange={(e) => set('slug', slugify(e.target.value))}
                placeholder="prp-therapy-hair-restoration" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
            </div>
          </div>

          {/* Category + Read time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Read Time</label>
              <input value={form.readTime} onChange={(e) => set('readTime', e.target.value)} placeholder="5 min read" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Excerpt <span className="font-normal text-gray-400">(shown on cards, max 300 chars)</span></label>
            <textarea rows={2} maxLength={300} value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)}
              placeholder="A brief summary shown on the blog card and in search results..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
            <p className="text-[10px] text-gray-400 mt-1">{(form.excerpt || '').length}/300</p>
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Body Content</label>
            {form.bodyBlocks.length === 0 && form.body.trim() && (
              <button
                type="button"
                onClick={() => set('bodyBlocks', markdownToBlocks(form.body))}
                className="mb-2 text-xs font-semibold text-[#0B2560] bg-[#f6faff] border border-[#0B2560]/10 rounded-lg px-3 py-2 hover:bg-[#0B2560]/5 transition"
              >
                ✨ Convert existing Markdown to blocks
              </button>
            )}
            <ContentBlockEditor
              blocks={form.bodyBlocks}
              onChange={(next) => set('bodyBlocks', next)}
              sourceSystem="content-block-blog"
            />
            {form.bodyBlocks.length === 0 && (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Or use Markdown for now</label>
                <textarea rows={14} value={form.body} onChange={(e) => set('body', e.target.value)}
                  placeholder={`## Introduction\n\nYour opening paragraph here...\n\n## What is PRP Therapy?\n\nExplain the topic in depth.\n\n- Point one\n- Point two\n- Point three\n\n> Expert tip: Add a blockquote for key insights.\n\n## Results & Recovery\n\nMore content...`}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono resize-y" />
                <p className="text-[10px] text-gray-400 mt-1">Use ## for headings, - for bullets, **bold**, *italic*, &gt; for quotes</p>
              </div>
            )}
          </div>

          {/* Author */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Author</label>
              <input value={form.author} onChange={(e) => set('author', e.target.value)} placeholder="DR Youth Clinic Team" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Author Title</label>
              <input value={form.authorTitle} onChange={(e) => set('authorTitle', e.target.value)} placeholder="Medical Content Team" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Tags <span className="font-normal text-gray-400">(comma-separated)</span></label>
            <input value={Array.isArray(form.tags) ? form.tags.join(', ') : form.tags}
              onChange={(e) => set('tags', e.target.value)} placeholder="PRP, Hair Loss, Hair Restoration" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Published date */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Publish Date</label>
            <input type="date" value={form.publishedAt?.toString().slice(0, 10) || ''} onChange={(e) => set('publishedAt', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Toggles */}
          <div className="flex gap-6 pt-1">
            {[
              { label: 'Published (Live)', key: 'active' },
              { label: 'Featured on Homepage', key: 'featured' },
            ].map(({ label, key }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                <button type="button" onClick={() => set(key, !(form as any)[key])}
                  className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${(form as any)[key] ? 'bg-[#0B2560]' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${(form as any)[key] ? 'translate-x-5' : ''}`} />
                </button>
                <span className="text-xs text-gray-600 font-medium">{label}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-[#0B2560] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#0d2d73] transition disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <><Loader size={14} className="animate-spin" /> Saving…</> : <><CheckCircle size={14} /> Save Post</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function BlogAdminPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any | null>(null);

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

  const savePost = async (data: any) => {
    try {
      if (data._id) {
        await fetch(`/api/admin/blog/${data._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      } else {
        await fetch('/api/admin/blog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      }
      setModal(null);
      fetchPosts();
    } catch {
      alert('Save failed — please check your connection and try again');
    }
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2560] flex items-center gap-2"><BookOpen size={22} /> Blog Posts</h1>
          <p className="text-gray-500 text-sm mt-0.5">Write & manage articles shown on the homepage and /blog page.</p>
        </div>
        <button onClick={() => setModal({})} className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d2d73] transition">
          <Plus size={15} /> New Post
        </button>
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
          <button onClick={() => setModal({})} className="bg-[#0B2560] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0d2d73] transition">+ New Post</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((p) => (
            <PostCard key={p._id} post={p}
              onToggle={toggle} onToggleFeatured={toggleFeatured} onDelete={deletePost}
              onEdit={(post) => setModal({ ...post, tags: Array.isArray(post.tags) ? post.tags.join(', ') : '', publishedAt: post.publishedAt?.slice?.(0, 10) || new Date().toISOString().slice(0, 10) })} />
          ))}
        </div>
      )}

      {modal !== null && (
        <BlogModal initial={modal} onClose={() => setModal(null)} onSave={savePost} />
      )}
    </div>
  );
}
