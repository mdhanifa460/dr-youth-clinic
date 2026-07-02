"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Save } from "lucide-react";

type ContentSettings = {
  blogPostsPerPage: number;
  defaultAuthorName: string;
  beforeAfterWatermark: string;
  testimonialMinRating: number;
  testimonialsRotateMs: number;
  schemaType: string;
};

const DEFAULTS: ContentSettings = {
  blogPostsPerPage: 9,
  defaultAuthorName: "DR Youth Clinic",
  beforeAfterWatermark: "DR Youth Clinic",
  testimonialMinRating: 4,
  testimonialsRotateMs: 4000,
  schemaType: "MedicalClinic",
};

const SCHEMA_OPTIONS: { value: string; label: string; desc: string }[] = [
  {
    value: "MedicalClinic",
    label: "Medical Clinic",
    desc: "Recommended for dermatology — shows in Google as a medical clinic",
  },
  {
    value: "BeautySalon",
    label: "Beauty Salon",
    desc: "Broader aesthetic services",
  },
  {
    value: "HealthAndBeautyBusiness",
    label: "Health & Beauty Business",
    desc: "Covers both medical and aesthetic services",
  },
];

export default function ContentSettingsPage() {
  const [form, setForm] = useState<ContentSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.content) setForm({ ...DEFAULTS, ...d.data.content });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function set<K extends keyof ContentSettings>(key: K, val: ContentSettings[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    setSaving(true); setError(""); setSuccess(false);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: form }),
    });
    const data = await res.json();
    setSaving(false);
    if (!data.success) { setError(data.message || "Save failed"); return; }
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#f6faff]">
      <Loader2 size={24} className="animate-spin text-gray-300" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6faff]">
      <div className="max-w-2xl mx-auto px-6 py-10">

        <Link href="/admin/settings" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0B2560] transition mb-6">
          <ArrowLeft size={14} /> Settings
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2560]">Content Settings</h1>
            <p className="text-gray-400 text-sm mt-0.5">Manage blog, gallery, testimonials, and schema markup.</p>
          </div>
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition disabled:opacity-50 shadow-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-6">
            <CheckCircle size={14} /> Settings saved
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Blog Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-[#0B2560] text-sm">Blog Settings</h2>
            <p className="text-gray-400 text-xs mt-0.5">Control how blog posts are listed and attributed.</p>
          </div>
          <div className="px-6 py-5 space-y-5">

            {/* Posts per page */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Posts per page</label>
              <div className="flex items-center gap-2 flex-wrap">
                {[6, 9, 12].map((n) => (
                  <button key={n} type="button"
                    onClick={() => set("blogPostsPerPage", n)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                      form.blogPostsPerPage === n
                        ? "bg-[#0B2560] text-white border-[#0B2560]"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}>{n}</button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={form.blogPostsPerPage}
                  onChange={(e) => set("blogPostsPerPage", +e.target.value)}
                  className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-[#0B2560]"
                />
              </div>
            </div>

            {/* Default author name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Default author name</label>
              <input
                type="text"
                value={form.defaultAuthorName}
                onChange={(e) => set("defaultAuthorName", e.target.value)}
                placeholder="DR Youth Clinic"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560]"
              />
              <p className="text-[11px] text-gray-400 mt-1">Used when a blog post has no author set.</p>
            </div>

          </div>
        </div>

        {/* Before & After Gallery */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-[#0B2560] text-sm">Before &amp; After Gallery</h2>
            <p className="text-gray-400 text-xs mt-0.5">Protect your gallery images with a subtle watermark.</p>
          </div>
          <div className="px-6 py-5">

            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Watermark text</label>
            <input
              type="text"
              value={form.beforeAfterWatermark}
              onChange={(e) => set("beforeAfterWatermark", e.target.value)}
              placeholder="DR Youth Clinic"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560]"
            />
            <p className="text-[11px] text-gray-400 mt-2">This text appears as a subtle watermark on before/after images to protect your content.</p>

          </div>
        </div>

        {/* Testimonials & Reviews */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-[#0B2560] text-sm">Testimonials &amp; Reviews</h2>
            <p className="text-gray-400 text-xs mt-0.5">Control which reviews show and how fast the carousel rotates.</p>
          </div>
          <div className="px-6 py-5 space-y-5">

            {/* Minimum rating */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Minimum rating to display</label>
              <div className="flex items-center gap-2 flex-wrap">
                {[3, 4, 5].map((r) => (
                  <button key={r} type="button"
                    onClick={() => set("testimonialMinRating", r)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                      form.testimonialMinRating === r
                        ? "bg-[#0B2560] text-white border-[#0B2560]"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}>{r}★ &amp; above</button>
                ))}
              </div>
            </div>

            {/* Auto-rotate speed */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Auto-rotate speed</label>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { ms: 3000, label: "3s" },
                  { ms: 4000, label: "4s" },
                  { ms: 5000, label: "5s" },
                  { ms: 6000, label: "6s" },
                ].map(({ ms, label }) => (
                  <button key={ms} type="button"
                    onClick={() => set("testimonialsRotateMs", ms)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                      form.testimonialsRotateMs === ms
                        ? "bg-[#0B2560] text-white border-[#0B2560]"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}>{label}</button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Schema Markup */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-[#0B2560] text-sm">Schema Markup</h2>
            <p className="text-gray-400 text-xs mt-0.5">How Google categorizes your business in search results.</p>
          </div>
          <div className="px-6 py-5 space-y-3">

            {SCHEMA_OPTIONS.map(({ value, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => set("schemaType", value)}
                className={`w-full text-left border rounded-xl p-4 cursor-pointer transition ${
                  form.schemaType === value
                    ? "border-[#0B2560] bg-[#f6faff]"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    form.schemaType === value ? "border-[#0B2560]" : "border-gray-300"
                  }`}>
                    {form.schemaType === value && (
                      <span className="w-2 h-2 rounded-full bg-[#0B2560]" />
                    )}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${form.schemaType === value ? "text-[#0B2560]" : "text-gray-700"}`}>
                      {label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              </button>
            ))}

            <p className="text-[11px] text-gray-400 pt-1">This tells Google how to categorize your business in search results.</p>

          </div>
        </div>

      </div>
    </div>
  );
}
