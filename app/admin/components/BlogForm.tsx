'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Plus, Trash2 } from 'lucide-react';
import ImageUpload from './ImageUpload';
import SeoPreviewCard from './SeoPreviewCard';
import SeoAiAssistant from './SeoAiAssistant';
import ContentBlockEditor from './contentblocks/ContentBlockEditor';
import BlogAiAssistantPanel from './BlogAiAssistantPanel';
import ArticleIntelligenceCard from './ArticleIntelligenceCard';
import { markdownToBlocks, blocksToPlainText } from '@/app/lib/contentBlocks/types';
import { BLOG_CATEGORIES } from '@/app/lib/blogCategories';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

const STEP_LABELS = ['Basic Info', 'Trust & Review', 'Content', 'SEO Setup', 'Publish'];
const TOTAL_STEPS = STEP_LABELS.length;

interface FormData {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  bodyBlocks: Array<{ id: string; type: string; visible: boolean; data: Record<string, any> }>;
  coverImage: { url: string; publicId: string };
  category: string;
  tags: string;
  author: string;
  authorTitle: string;
  readTime: string;
  publishedAt: string;
  featured: boolean;
  active: boolean;
  reviewedByDoctorId: string;
  medicalReferences: Array<{ label: string; url: string }>;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  keywords: string;
  ogImage: { url: string; publicId: string };
}

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const EMPTY_FORM: FormData = {
  title: '', slug: '', excerpt: '', body: '', bodyBlocks: [],
  coverImage: { url: '', publicId: '' },
  category: 'General', tags: '', author: 'DR Youth Clinic Team',
  authorTitle: 'Medical Content Team', readTime: '5 min read',
  publishedAt: new Date().toISOString().split('T')[0],
  featured: false, active: true,
  reviewedByDoctorId: '', medicalReferences: [],
  metaTitle: '', metaDescription: '', canonicalUrl: '', keywords: '',
  ogImage: { url: '', publicId: '' },
};

export default function BlogForm({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [doctors, setDoctors] = useState<{ _id: string; name: string; title?: string }[]>([]);

  const [form, setForm] = useState<FormData>(
    initialData
      ? {
          ...EMPTY_FORM,
          ...initialData,
          tags: Array.isArray(initialData.tags) ? initialData.tags.join(', ') : initialData.tags ?? '',
          keywords: Array.isArray(initialData.keywords) ? initialData.keywords.join(', ') : initialData.keywords ?? '',
          publishedAt: initialData.publishedAt?.toString().slice(0, 10) || EMPTY_FORM.publishedAt,
          reviewedByDoctorId: initialData.reviewedByDoctorId || '',
          medicalReferences: initialData.medicalReferences ?? [],
          coverImage: initialData.coverImage ?? EMPTY_FORM.coverImage,
          ogImage: initialData.ogImage ?? EMPTY_FORM.ogImage,
          bodyBlocks: initialData.bodyBlocks ?? [],
        }
      : EMPTY_FORM
  );

  const updateForm = (patch: Partial<FormData>) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    fetch('/api/admin/doctors')
      .then((r) => r.json())
      .then((d) => { if (d.success) setDoctors(d.data ?? []); })
      .catch(() => {});
  }, []);

  const handleTitleChange = (v: string) => {
    updateForm({ title: v });
    if (!initialData?._id) updateForm({ slug: slugify(v) });
  };

  const addReference = () => updateForm({ medicalReferences: [...form.medicalReferences, { label: '', url: '' }] });
  const updateReference = (i: number, patch: Partial<{ label: string; url: string }>) =>
    updateForm({ medicalReferences: form.medicalReferences.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  const removeReference = (i: number) => updateForm({ medicalReferences: form.medicalReferences.filter((_, idx) => idx !== i) });

  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        if (!form.title.trim()) { setError('Title is required'); return false; }
        if (!form.slug.trim()) { setError('Slug is required'); return false; }
        break;
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const url = initialData?._id ? `/api/admin/blog/${initialData._id}` : '/api/admin/blog';
      const method = initialData?._id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
          keywords: form.keywords.split(',').map((k) => k.trim()).filter(Boolean),
          // `null` (not `undefined`) so clearing a previously-assigned doctor
          // actually reaches the server — JSON.stringify drops `undefined`
          // keys entirely, and PUT does an implicit $set over only the keys
          // present in the body, so an absent key would leave the old value
          // in place instead of clearing it.
          reviewedByDoctorId: form.reviewedByDoctorId || null,
          medicalReferences: form.medicalReferences.filter((r) => r.label.trim() && r.url.trim()),
        }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || 'Failed to save post'); return; }
      setSuccess(true);
      setTimeout(() => router.push('/admin/blog'), 1600);
    } catch (err: any) {
      setError(err.message || 'Failed to save post');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-[#0B2560] mb-1">Post Saved!</h2>
        <p className="text-gray-500 text-sm">{form.title}</p>
        <p className="text-xs text-gray-400 mt-4">Redirecting to Blog Posts…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* PROGRESS BAR */}
      <div className="mb-8">
        <div className="flex justify-between mb-3">
          {STEP_LABELS.map((label, i) => {
            const s = i + 1;
            return (
              <div key={s} className="flex flex-col items-center gap-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition ${step >= s ? 'bg-[#0B2560] text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {s}
                </div>
                <span className={`text-[10px] font-medium hidden sm:block ${step === s ? 'text-[#0B2560]' : 'text-gray-400'}`}>{label}</span>
              </div>
            );
          })}
        </div>
        <div className="w-full bg-gray-100 h-1 rounded-full">
          <div className="bg-[#0B2560] h-1 rounded-full transition-all" style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl mb-6 flex gap-3">
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* ── STEP 1: BASIC INFORMATION ── */}
      {step === 1 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-2xl font-bold text-[#0B2560]">Basic Information</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Cover Image</label>
            <ImageUpload folder="dr-youth-clinic/blog" onUpload={(d) => updateForm({ coverImage: d })} />
            {form.coverImage?.url && (
              <div className="flex items-center gap-2 mt-2">
                <img src={form.coverImage.url} alt="" className="w-16 h-10 rounded-lg object-cover" />
                <span className="text-xs text-gray-400">Current cover</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="PRP Therapy: Complete Guide to Hair Restoration"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Slug * <span className="font-normal text-gray-400">(URL path)</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 shrink-0">/blog/</span>
              <input
                value={form.slug}
                onChange={(e) => updateForm({ slug: slugify(e.target.value) })}
                placeholder="prp-therapy-hair-restoration"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
              <select value={form.category} onChange={(e) => updateForm({ category: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm">
                {BLOG_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Read Time</label>
              <input value={form.readTime} onChange={(e) => updateForm({ readTime: e.target.value })} placeholder="5 min read" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Excerpt <span className="font-normal text-gray-400">(shown on cards, max 300 chars)</span>
            </label>
            <textarea rows={2} maxLength={300} value={form.excerpt} onChange={(e) => updateForm({ excerpt: e.target.value })}
              placeholder="A brief summary shown on the blog card and in search results..." className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none" />
            <p className="text-[10px] text-gray-400 mt-1">{form.excerpt.length}/300</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Author</label>
              <input value={form.author} onChange={(e) => updateForm({ author: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Author Title</label>
              <input value={form.authorTitle} onChange={(e) => updateForm({ authorTitle: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tags <span className="font-normal text-gray-400">(comma-separated)</span></label>
            <input value={form.tags} onChange={(e) => updateForm({ tags: e.target.value })} placeholder="PRP, Hair Loss, Hair Restoration" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Publish Date</label>
            <input type="date" value={form.publishedAt} onChange={(e) => updateForm({ publishedAt: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
          </div>

          <div className="flex gap-6 pt-1">
            {([['active', 'Published (Live)'], ['featured', 'Featured on Homepage']] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                <button type="button" onClick={() => updateForm({ [key]: !form[key] } as Partial<FormData>)}
                  className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${form[key] ? 'bg-[#0B2560]' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form[key] ? 'translate-x-5' : ''}`} />
                </button>
                <span className="text-xs text-gray-600 font-medium">{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 2: TRUST & REVIEW ── */}
      {step === 2 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-2xl font-bold text-[#0B2560]">Trust & Review</h2>
          <p className="text-sm text-gray-500 -mt-4">
            Assign a reviewing doctor and cite medical sources — this powers the article&apos;s trust
            section, the &quot;Doctor-recommended reads&quot; listing, and the Article Intelligence score.
          </p>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Reviewed By</label>
            <select
              value={form.reviewedByDoctorId}
              onChange={(e) => updateForm({ reviewedByDoctorId: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
            >
              <option value="">— No doctor assigned —</option>
              {doctors.map((d) => <option key={d._id} value={d._id}>{d.name}{d.title ? ` — ${d.title}` : ''}</option>)}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">Medical References</label>
              <button type="button" onClick={addReference} className="flex items-center gap-1 text-xs font-semibold text-[#0B2560] hover:text-[#0d2d73] transition">
                <Plus size={13} /> Add Reference
              </button>
            </div>
            {form.medicalReferences.length === 0 ? (
              <p className="text-xs text-gray-400">No sources cited yet.</p>
            ) : (
              <div className="space-y-2">
                {form.medicalReferences.map((ref, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={ref.label} onChange={(e) => updateReference(i, { label: e.target.value })} placeholder="Source name (e.g. AAD, PubMed)" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                    <input value={ref.url} onChange={(e) => updateReference(i, { url: e.target.value })} placeholder="https://..." className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
                    <button type="button" onClick={() => removeReference(i)} className="text-gray-300 hover:text-red-500 transition shrink-0">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 3: CONTENT & MEDIA ── */}
      {step === 3 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-2xl font-bold text-[#0B2560]">Content & Media</h2>

          {form.bodyBlocks.length === 0 && form.body.trim() && (
            <button
              type="button"
              onClick={() => updateForm({ bodyBlocks: markdownToBlocks(form.body) })}
              className="text-xs font-semibold text-[#0B2560] bg-[#f6faff] border border-[#0B2560]/10 rounded-lg px-3 py-2 hover:bg-[#0B2560]/5 transition"
            >
              ✨ Convert existing Markdown to blocks
            </button>
          )}

          <BlogAiAssistantPanel
            topic={form.title}
            context={blocksToPlainText(form.bodyBlocks, 6000)}
            onInsertBlock={(block) => updateForm({ bodyBlocks: [...form.bodyBlocks, block] })}
          />

          <ContentBlockEditor
            blocks={form.bodyBlocks}
            onChange={(next) => updateForm({ bodyBlocks: next })}
            sourceSystem="content-block-blog"
          />

          {form.bodyBlocks.length === 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Or use Markdown for now</label>
              <textarea rows={14} value={form.body} onChange={(e) => updateForm({ body: e.target.value })}
                placeholder={`## Introduction\n\nYour opening paragraph here...\n\n## What is PRP Therapy?\n\nExplain the topic in depth.\n\n- Point one\n- Point two\n- Point three\n\n> Expert tip: Add a blockquote for key insights.\n\n## Results & Recovery\n\nMore content...`}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono resize-y" />
              <p className="text-[10px] text-gray-400 mt-1">Use ## for headings, - for bullets, **bold**, *italic*, &gt; for quotes</p>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 4: SEO SETUP ── */}
      {step === 4 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-2xl font-bold text-[#0B2560]">SEO Setup</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Meta Title <span className="font-normal text-gray-400">(max 60 chars)</span></label>
            <input maxLength={60} value={form.metaTitle} onChange={(e) => updateForm({ metaTitle: e.target.value })}
              placeholder={form.title || 'Defaults to the post title'} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
            <p className="text-[10px] text-gray-400 mt-1">{form.metaTitle.length}/60</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Meta Description <span className="font-normal text-gray-400">(max 160 chars)</span></label>
            <textarea rows={2} maxLength={160} value={form.metaDescription} onChange={(e) => updateForm({ metaDescription: e.target.value })}
              placeholder={form.excerpt || 'Defaults to the post excerpt'} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none" />
            <p className="text-[10px] text-gray-400 mt-1">{form.metaDescription.length}/160</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Canonical URL</label>
            <input value={form.canonicalUrl} onChange={(e) => updateForm({ canonicalUrl: e.target.value })}
              placeholder={`${SITE_URL}/blog/${form.slug || '{slug}'}`} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Keywords <span className="font-normal text-gray-400">(comma-separated)</span></label>
            <input value={form.keywords} onChange={(e) => updateForm({ keywords: e.target.value })} placeholder="hair prp, hair restoration chennai" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
          </div>

          <SeoAiAssistant
            lpId={initialData?._id || 'new'}
            endpoint={`/api/admin/blog/${initialData?._id || 'new'}/seo-keywords`}
            pageTitle={form.title}
            template={form.category}
            description={form.metaDescription}
            keywords={form.keywords}
            onApplyDescription={(v) => updateForm({ metaDescription: v.slice(0, 160) })}
            onKeywordsChange={(v) => updateForm({ keywords: v })}
          />

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Social Share Image <span className="font-normal text-gray-400">(defaults to cover image)</span></label>
            <ImageUpload folder="dr-youth-clinic/blog" onUpload={(d) => updateForm({ ogImage: d })} />
          </div>

          <SeoPreviewCard
            title={form.metaTitle}
            description={form.metaDescription}
            keywords={form.keywords}
            slug={form.slug}
            location=""
            serviceName={form.title}
            narrative={form.excerpt}
          />
        </div>
      )}

      {/* ── STEP 5: REVIEW & PUBLISH ── */}
      {step === 5 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-2xl font-bold text-[#0B2560]">Review & Publish</h2>

          <div className="bg-[#f6faff] p-5 rounded-xl border border-blue-50 space-y-3">
            <h3 className="font-bold text-[#0B2560] text-sm">Post Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p><span className="text-gray-500">Title:</span> <span className="font-semibold">{form.title || '—'}</span></p>
              <p><span className="text-gray-500">Category:</span> <span className="font-semibold">{form.category}</span></p>
              <p><span className="text-gray-500">Status:</span> <span className="font-semibold">{form.active ? 'Live' : 'Draft'}</span></p>
              <p><span className="text-gray-500">Featured:</span> <span className="font-semibold">{form.featured ? 'Yes' : 'No'}</span></p>
              <p><span className="text-gray-500">Reviewed by:</span> <span className="font-semibold">{doctors.find((d) => d._id === form.reviewedByDoctorId)?.name || '—'}</span></p>
              <p><span className="text-gray-500">Blocks:</span> <span className="font-semibold">{form.bodyBlocks.length}</span></p>
            </div>
            {form.slug && (
              <p className="text-xs text-gray-400 font-mono pt-1 border-t border-blue-50">URL: /blog/{form.slug}</p>
            )}
          </div>

          <ArticleIntelligenceCard
            post={{
              bodyBlocks: form.bodyBlocks,
              reviewedByDoctorId: form.reviewedByDoctorId,
              medicalReferences: form.medicalReferences,
              metaTitle: form.metaTitle,
              metaDescription: form.metaDescription,
              category: form.category,
            }}
          />
        </div>
      )}

      {/* NAVIGATION */}
      <div className="flex gap-4 mt-8">
        {step > 1 && (
          <button onClick={() => { setError(''); setStep(step - 1); }} className="px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-sm font-medium">
            ← Previous
          </button>
        )}
        {step < TOTAL_STEPS ? (
          <button
            onClick={() => { if (validateStep(step)) { setError(''); setStep(step + 1); } }}
            className="ml-auto px-8 py-3 bg-[#0B2560] text-white rounded-xl hover:bg-[#0d2d73] transition text-sm font-semibold"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="ml-auto px-8 py-3 bg-[#0B2560] text-white rounded-xl hover:bg-[#0d2d73] transition text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save Post'}
          </button>
        )}
      </div>
    </div>
  );
}
