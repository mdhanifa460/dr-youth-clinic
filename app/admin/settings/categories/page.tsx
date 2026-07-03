"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, Pencil, X, Loader2,
  CheckCircle, AlertCircle, Tag, GripVertical
} from "lucide-react";

type Category = {
  _id: string;
  label: string;
  slug: string;
  dbKey: string;
  icon: string;
  description: string;
  heroGrad: string;
  accentColor: string;
  order: number;
  active: boolean;
};

const EMPTY: Omit<Category, "_id"> = {
  label: "", slug: "", dbKey: "", icon: "✨",
  description: "", heroGrad: "from-[#0B2560] via-[#1e3a8a] to-[#3b82f6]",
  accentColor: "#3b82f6", order: 0, active: true,
};

const PRESET_GRADS = [
  { label: "Rose", value: "from-[#7c1d0a] via-[#a63c1c] to-[#c96a4e]" },
  { label: "Amber", value: "from-[#6b2d00] via-[#9a4109] to-[#d97706]" },
  { label: "Blue", value: "from-[#0B2560] via-[#1e3a8a] to-[#3b82f6]" },
  { label: "Teal", value: "from-[#052e16] via-[#064e3b] to-[#059669]" },
  { label: "Purple", value: "from-[#3b0764] via-[#6d28d9] to-[#7c3aed]" },
  { label: "Pink", value: "from-[#831843] via-[#be185d] to-[#ec4899]" },
];

const ICON_SUGGESTIONS = ["✨", "🌿", "⚡", "🏥", "💉", "🔬", "💆", "🫧", "🌸", "🧴", "🩺", "🪷"];

export default function CategoriesSettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Category, "_id">>(EMPTY);

  useEffect(() => { fetchCategories(); }, []);

  async function fetchCategories() {
    setLoading(true);
    const res = await fetch("/api/admin/categories");
    const data = await res.json();
    setCategories(data.success ? data.data : []);
    setLoading(false);
  }

  function openAdd() {
    setEditId(null);
    setForm({ ...EMPTY, order: categories.length });
    setError("");
    setModalOpen(true);
  }

  function openEdit(c: Category) {
    setEditId(c._id);
    setForm({ ...c });
    setError("");
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditId(null); setError(""); }

  function autoSlug(label: string) {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function save() {
    if (!form.label.trim()) { setError("Label is required."); return; }
    if (!form.slug.trim()) { setError("Slug is required."); return; }
    setSaving(true); setError("");
    try {
    const url = editId ? `/api/admin/categories/${editId}` : "/api/admin/categories";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!data.success) { setError(data.message || "Save failed"); return; }
    setSuccess(editId ? "Category updated" : "Category added");
    setTimeout(() => setSuccess(""), 3000);
    closeModal();
    fetchCategories();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6faff]">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin/settings" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0B2560] transition mb-2">
              <ArrowLeft size={14} /> Settings
            </Link>
            <h1 className="text-2xl font-bold text-[#0B2560]">Service Categories</h1>
            <p className="text-gray-500 text-sm mt-0.5">{categories.length} categories · customize display labels, icons, and colors</p>
          </div>
          <button onClick={openAdd}
            className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition shadow-sm">
            <Plus size={16} /> Add Category
          </button>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-6">
            <CheckCircle size={15} /> {success}
          </div>
        )}

        {/* Info banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 text-sm text-amber-800 mb-6 flex items-start gap-2.5">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>
            The 4 default categories (Skin, Hair, Laser, Other) are linked to existing services. Editing their display is safe.
            Adding a new category requires also updating the service schema to accept it.
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((c) => (
              <div key={c._id} className={`bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 hover:shadow-sm transition ${!c.active ? "opacity-60" : ""}`}>
                <GripVertical size={16} className="text-gray-200 shrink-0" />

                {/* Gradient swatch */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.heroGrad} shrink-0 flex items-center justify-center text-xl`}>
                  {c.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0B2560]">{c.label}</span>
                    {!c.active && <span className="text-[10px] font-bold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Inactive</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <code className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded font-mono">/{c.slug}</code>
                    <code className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded font-mono">db: {c.dbKey}</code>
                    <span className="text-[11px] text-gray-400">order: {c.order}</span>
                  </div>
                  {c.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{c.description}</p>
                  )}
                </div>

                <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#0B2560] transition shrink-0">
                  <Pencil size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="font-bold text-[#0B2560] text-lg">{editId ? "Edit Category" : "Add Category"}</h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* Live preview */}
              <div className={`rounded-xl bg-gradient-to-br ${form.heroGrad} p-5 text-white flex items-center gap-4`}>
                <span className="text-4xl">{form.icon || "✨"}</span>
                <div>
                  <p className="font-bold text-lg leading-tight">{form.label || "Category Label"}</p>
                  <p className="text-white/60 text-sm mt-0.5">{form.description?.slice(0, 60) || "Description preview…"}</p>
                </div>
              </div>

              {/* Label & Slug */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Label *</label>
                  <input
                    value={form.label}
                    onChange={(e) => setForm((f) => ({
                      ...f, label: e.target.value,
                      slug: editId ? f.slug : autoSlug(e.target.value),
                      dbKey: editId ? f.dbKey : e.target.value.trim(),
                    }))}
                    placeholder="Hair Restoration"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] focus:ring-1 focus:ring-[#0B2560]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">URL Slug *</label>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                    placeholder="hair"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[#0B2560]"
                  />
                </div>
              </div>

              {/* DB Key */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  DB Key <span className="font-normal text-gray-400">(used in services — case-sensitive)</span>
                </label>
                <input
                  value={form.dbKey}
                  onChange={(e) => setForm((f) => ({ ...f, dbKey: e.target.value }))}
                  placeholder="Hair"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[#0B2560]"
                />
              </div>

              {/* Icon picker */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Icon</label>
                <div className="flex items-center gap-3">
                  <input
                    value={form.icon}
                    onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                    className="w-20 border border-gray-200 rounded-xl px-3 py-2.5 text-center text-xl focus:outline-none focus:border-[#0B2560]"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {ICON_SUGGESTIONS.map((ic) => (
                      <button key={ic} type="button"
                        onClick={() => setForm((f) => ({ ...f, icon: ic }))}
                        className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition ${form.icon === ic ? "bg-[#0B2560]/10 ring-2 ring-[#0B2560]" : "hover:bg-gray-100"}`}>
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Gradient picker */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Hero Gradient</label>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_GRADS.map((g) => (
                    <button key={g.value} type="button"
                      onClick={() => setForm((f) => ({ ...f, heroGrad: g.value }))}
                      className={`h-10 rounded-xl bg-gradient-to-br ${g.value} transition ${form.heroGrad === g.value ? "ring-2 ring-[#0B2560] ring-offset-1" : ""}`}
                      title={g.label}
                    />
                  ))}
                </div>
                <input
                  value={form.heroGrad}
                  onChange={(e) => setForm((f) => ({ ...f, heroGrad: e.target.value }))}
                  placeholder="Custom Tailwind gradient classes"
                  className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#0B2560]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Description</label>
                <textarea rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  maxLength={300}
                  placeholder="Brief description shown on the category page…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] resize-none"
                />
                <p className="text-right text-[11px] text-gray-300">{form.description?.length ?? 0}/300</p>
              </div>

              {/* Order & Active */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Display Order</label>
                  <input type="number" min={0}
                    value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: +e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B2560]" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-4">
                  <div onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
                    className={`relative rounded-full transition-colors ${form.active ? "bg-green-500" : "bg-gray-200"}`}
                    style={{ width: "40px", height: "22px" }}>
                    <div className={`absolute top-0.5 bg-white rounded-full shadow transition-transform ${form.active ? "translate-x-5" : "translate-x-0.5"}`}
                      style={{ width: "18px", height: "18px" }} />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Active</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button type="button" onClick={closeModal}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition">
                Cancel
              </button>
              <button type="button" onClick={save} disabled={saving}
                className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0d2d72] transition disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {editId ? "Save Changes" : "Add Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
