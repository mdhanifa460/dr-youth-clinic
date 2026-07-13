"use client";

import { useState, useEffect } from "react";
import { Loader, Trash2, Sparkles, RefreshCw, AlertTriangle, CheckCircle, Copy, Search } from "lucide-react";

interface MediaImage {
  publicId: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  createdAt: string;
  ageInDays?: number;
  isUsed?: boolean;
  duplicateCount?: number;
  duplicateGroup?: string | null;
  // Same width+height+bytes as another asset but a different checksum — a
  // weaker "likely the same photo, re-uploaded" signal than duplicateGroup
  // (which is a byte-for-byte identical match).
  possibleDuplicateCount?: number;
  possibleDuplicateGroup?: string | null;
}

const CLEANUP_AGE_DAYS = 90;

function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

type Filter = "all" | "suggested" | "unused" | "duplicates" | "possible-duplicates";

export default function MediaLibraryPage() {
  const [images, setImages] = useState<MediaImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<MediaImage[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadBasic = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/media?folder=dr-youth-clinic");
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setImages(data.images);
      setAnalyzed(false);
    } catch (e: any) {
      setError(e.message || "Failed to load images");
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError("");
    try {
      const res = await fetch("/api/admin/media/analyze");
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setImages(data.images);
      setAnalyzed(true);
    } catch (e: any) {
      setError(e.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    loadBasic();
  }, []);

  const filtered = images.filter((img) => {
    if (search && !img.publicId.toLowerCase().includes(search.toLowerCase())) return false;
    if (!analyzed) return true;
    if (filter === "suggested") return !img.isUsed && (img.ageInDays ?? 0) >= CLEANUP_AGE_DAYS;
    if (filter === "unused") return !img.isUsed;
    if (filter === "duplicates") return !!img.duplicateGroup;
    if (filter === "possible-duplicates") return !!img.possibleDuplicateGroup;
    return true;
  });

  const toggleSelect = (publicId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(publicId) ? next.delete(publicId) : next.add(publicId);
      return next;
    });
  };

  const doDelete = async (targets: MediaImage[]) => {
    setDeleting(true);
    for (const img of targets) {
      try {
        await fetch("/api/admin/media", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: img.publicId }),
        });
      } catch {
        // continue deleting the rest even if one fails
      }
    }
    setDeleting(false);
    setDeleteTarget(null);
    setSelected(new Set());
    analyzed ? runAnalysis() : loadBasic();
  };

  const suggestedCount = images.filter((i) => !i.isUsed && (i.ageInDays ?? 0) >= CLEANUP_AGE_DAYS).length;
  const unusedCount = images.filter((i) => !i.isUsed).length;
  const duplicateCount = images.filter((i) => !!i.duplicateGroup).length;
  const possibleDuplicateCount = images.filter((i) => !!i.possibleDuplicateGroup).length;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2560]">Media Library</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {images.length} image{images.length !== 1 ? "s" : ""} in Cloudinary storage
            {analyzed && <> · {fmt(images.reduce((s, i) => s + (i.bytes || 0), 0))} total</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runAnalysis}
            disabled={analyzing}
            className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0d2d73] transition disabled:opacity-50"
          >
            {analyzing ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {analyzing ? "Analyzing…" : analyzed ? "Re-analyze" : "Analyze for Cleanup"}
          </button>
          <button type="button" onClick={analyzed ? runAnalysis : loadBasic} title="Refresh"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {!analyzed && !analyzing && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
          <Sparkles size={16} className="text-[#3B82C4] mt-0.5 shrink-0" />
          <p className="text-sm text-blue-800">
            Click <strong>Analyze for Cleanup</strong> to check every image against every service, doctor, blog
            post, offer, video, homepage/landing page section, and AI Assessment question/patient photo —
            flagging which are actually used, which are exact-duplicate uploads (plus likely re-uploads of the
            same photo at a different size/compression), and which have sat unused for {CLEANUP_AGE_DAYS}+ days.
            Nothing is ever deleted automatically — you review and confirm every deletion.
          </p>
        </div>
      )}

      {analyzed && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {([
            ["all", `All (${images.length})`],
            ["suggested", `🧹 Suggested Cleanup (${suggestedCount})`],
            ["unused", `⚠️ Unused (${unusedCount})`],
            ["duplicates", `🔁 Duplicates (${duplicateCount})`],
            ["possible-duplicates", `🔁? Possible Duplicates (${possibleDuplicateCount})`],
          ] as [Filter, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                filter === key ? "bg-[#0B2560] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by filename…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0B2560] w-64"
          />
        </div>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={() => setDeleteTarget(images.filter((i) => selected.has(i.publicId)))}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-600 transition"
          >
            <Trash2 size={14} /> Delete Selected ({selected.size})
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center h-52">
          <Loader size={24} className="animate-spin text-[#0B2560]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 gap-2 text-gray-400">
          <span className="text-4xl">📷</span>
          <p className="text-sm">No images match this view</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((img) => {
            const isSelected = selected.has(img.publicId);
            const stale = analyzed && !img.isUsed && (img.ageInDays ?? 0) >= CLEANUP_AGE_DAYS;
            return (
              <div
                key={img.publicId}
                className={`group relative rounded-2xl overflow-hidden border-2 transition-all ${
                  isSelected ? "border-[#0B2560] ring-2 ring-[#0B2560]/20" : "border-gray-100"
                }`}
              >
                <button type="button" onClick={() => toggleSelect(img.publicId)} className="block w-full aspect-square">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>

                {isSelected && (
                  <div className="absolute top-2 left-2 w-5 h-5 bg-[#0B2560] rounded-full flex items-center justify-center">
                    <CheckCircle size={13} className="text-white" />
                  </div>
                )}

                {analyzed && (
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    {!img.isUsed && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${stale ? "bg-red-500 text-white" : "bg-amber-400 text-[#0B2560]"}`}>
                        {stale ? "STALE" : "UNUSED"}
                      </span>
                    )}
                    {img.duplicateGroup && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500 text-white flex items-center gap-0.5">
                        <Copy size={8} /> ×{img.duplicateCount}
                      </span>
                    )}
                    {!img.duplicateGroup && img.possibleDuplicateGroup && (
                      <span title="Same dimensions and file size as another image — likely a re-upload of the same photo" className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-200 text-purple-800 flex items-center gap-0.5">
                        <Copy size={8} /> ×{img.possibleDuplicateCount}?
                      </span>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setDeleteTarget([img])}
                  title="Delete"
                  className="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-black/60 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 size={12} />
                </button>

                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[9px] px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <p className="truncate font-medium">{img.publicId.split("/").pop()}</p>
                  <p className="text-white/60">
                    {fmt(img.bytes)}{analyzed && img.ageInDays !== undefined ? ` · ${img.ageInDays}d old` : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-[#0B2560]">Delete {deleteTarget.length} image{deleteTarget.length !== 1 ? "s" : ""}?</h3>
                <p className="text-xs text-gray-400">This permanently removes them from Cloudinary. Cannot be undone.</p>
              </div>
            </div>

            {deleteTarget.some((i) => i.isUsed) && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 text-xs text-red-700">
                ⚠️ At least one selected image is currently marked as <strong>used</strong> somewhere on the site.
                Deleting it may break a live page.
              </div>
            )}

            <div className="grid grid-cols-5 gap-2 mb-5 max-h-40 overflow-y-auto">
              {deleteTarget.map((img) => (
                <img key={img.publicId} src={img.url} alt="" className="aspect-square rounded-lg object-cover border border-gray-100" />
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => doDelete(deleteTarget)}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-red-500 text-white font-semibold hover:bg-red-600 transition disabled:opacity-50"
              >
                {deleting ? <Loader size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {deleting ? "Deleting…" : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
