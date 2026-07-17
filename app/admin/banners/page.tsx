"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader, Plus, Eye, Pencil, Trash2, Power, GripVertical, X } from "lucide-react";
import SectionList from "@/app/admin/components/builder/SectionList";
import { BANNER_TEMPLATES, type BannerTemplateType } from "@/app/lib/banners/types";

interface BannerRow {
  id: string;
  type: string;
  visible: boolean;
  data: any;
}

const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  draft: "bg-gray-100 text-gray-500",
  disabled: "bg-red-50 text-red-500",
};

function scheduleSummary(b: any): string {
  if (!b.startDate && !b.endDate) return "";
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  if (b.startDate && b.endDate) return `${fmt(b.startDate)} – ${fmt(b.endDate)}`;
  if (b.startDate) return `From ${fmt(b.startDate)}`;
  return `Until ${fmt(b.endDate)}`;
}

export default function BannersAdminPage() {
  const router = useRouter();
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/banners")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setBanners(d.data.map((b: any) => ({ id: b._id, type: b.templateType, visible: b.status === "active", data: b })));
        }
      })
      .catch(() => setError("Failed to load banners"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // framer-motion's Reorder fires onReorder repeatedly mid-drag (once per
  // pairwise swap, not just once on drop) — debounced so only the FINAL
  // order after the gesture settles gets PATCHed, instead of several
  // unsequenced requests racing each other over the network.
  const reorderTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleReorder = (next: BannerRow[]) => {
    const reordered = next.map((s, idx) => ({ ...s, data: { ...s.data, order: idx + 1 } }));
    setBanners(reordered);

    if (reorderTimeout.current) clearTimeout(reorderTimeout.current);
    reorderTimeout.current = setTimeout(() => {
      fetch("/api/admin/banners/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: reordered.map((s, idx) => ({ id: s.id, order: idx + 1 })) }),
      }).catch(() => {});
    }, 500);
  };

  const createBanner = async (type: BannerTemplateType) => {
    setCreating(true);
    setError("");
    try {
      const def = BANNER_TEMPLATES.find((t) => t.type === type)!;
      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `New ${def.label} Banner`,
          templateType: type,
          ...def.defaultData,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      router.push(`/admin/banners/${data.data._id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create banner");
      setCreating(false);
    }
  };

  const toggleStatus = async (b: BannerRow) => {
    const nextStatus = b.data.status === "active" ? "disabled" : "active";
    setBanners((prev) => prev.map((x) => (x.id === b.id ? { ...x, visible: nextStatus === "active", data: { ...x.data, status: nextStatus } } : x)));
    await fetch(`/api/admin/banners/${b.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    }).catch(() => {});
  };

  const deleteBanner = async (b: BannerRow) => {
    if (!confirm(`Delete "${b.data.title}"? This cannot be undone.`)) return;
    setBanners((prev) => prev.filter((x) => x.id !== b.id));
    await fetch(`/api/admin/banners/${b.id}`, { method: "DELETE" }).catch(() => {});
  };

  if (loading) return <div className="text-center py-20 text-gray-400"><Loader className="animate-spin mx-auto mb-2" size={22} />Loading banners…</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎯 Banners</h1>
          <p className="text-sm text-gray-500 mt-1">Homepage, location, and service page hero banners — schedulable and drag-reorderable.</p>
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1a3a6e] transition"
        >
          <Plus size={16} /> New Banner
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

      {banners.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
          No banners yet — click "New Banner" to create your first one.
        </div>
      ) : (
        <SectionList
          sections={banners}
          onReorder={handleReorder}
          renderSection={(b, i, dragControls) => (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <button
                onPointerDown={(e) => dragControls.start(e)}
                className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0 touch-none"
              >
                <GripVertical size={18} />
              </button>

              <span className="text-2xl shrink-0">{BANNER_TEMPLATES.find((t) => t.type === b.type)?.icon || "🎯"}</span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-800 truncate">{b.data.title}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_STYLE[b.data.status] || STATUS_STYLE.draft}`}>
                    {b.data.status}
                  </span>
                  {b.data.smartRules && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">⚡ Smart Rules</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{BANNER_TEMPLATES.find((t) => t.type === b.type)?.label}</span>
                  {b.data.showOnHomepage && <span title="Homepage">🏠</span>}
                  {b.data.showOnLocationPage && <span title="Location pages">📍</span>}
                  {b.data.showOnServicePage && <span title="Service pages">🩺</span>}
                  {scheduleSummary(b.data) && <span>· {scheduleSummary(b.data)}</span>}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Link href={`/admin/banners/${b.id}/preview`} target="_blank" title="Preview" className="p-2 text-gray-400 hover:text-[#0B2560] hover:bg-gray-50 rounded-lg transition">
                  <Eye size={16} />
                </Link>
                <Link href={`/admin/banners/${b.id}`} title="Edit" className="p-2 text-gray-400 hover:text-[#0B2560] hover:bg-gray-50 rounded-lg transition">
                  <Pencil size={16} />
                </Link>
                <button
                  onClick={() => toggleStatus(b)}
                  title={b.data.status === "active" ? "Disable" : "Enable"}
                  className={`p-2 rounded-lg transition ${b.data.status === "active" ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-50"}`}
                >
                  <Power size={16} />
                </button>
                <button onClick={() => deleteBanner(b)} title="Delete" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )}
        />
      )}

      {pickerOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !creating && setPickerOpen(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#0B2560] text-lg">Choose a Template</h2>
              <button onClick={() => setPickerOpen(false)} disabled={creating} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {BANNER_TEMPLATES.map((t) => (
                <button
                  key={t.type}
                  disabled={creating}
                  onClick={() => createBanner(t.type)}
                  className="flex flex-col items-start gap-1 p-4 border border-gray-100 rounded-xl hover:border-[#0B2560]/40 hover:bg-[#f6faff] transition text-left disabled:opacity-50"
                >
                  <span className="text-2xl">{t.icon}</span>
                  <span className="font-bold text-sm text-[#0B2560]">{t.label}</span>
                  <span className="text-xs text-gray-400">{t.description}</span>
                </button>
              ))}
            </div>
            {creating && <p className="text-center text-sm text-gray-400 mt-4"><Loader className="animate-spin inline mr-2" size={14} />Creating…</p>}
          </div>
        </div>
      )}
    </div>
  );
}
