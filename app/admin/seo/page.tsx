"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Globe, Loader2 } from "lucide-react";

interface PageSeoEntry {
  pageKey: string;
  pageLabel: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  updatedAt?: string;
}

export default function AdminSeoPage() {
  const [entries, setEntries] = useState<PageSeoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    fetch("/api/admin/page-seo")
      .then((r) => r.json())
      .then((d) => { if (d.success) setEntries(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const getField = (key: string, field: "metaTitle" | "metaDescription" | "keywords"): string => {
    if (edits[key] && field in edits[key]) return edits[key][field];
    const entry = entries.find((e) => e.pageKey === key);
    if (!entry) return "";
    if (field === "keywords") return (entry.keywords ?? []).join(", ");
    return (entry[field] ?? "") as string;
  };

  const setField = (key: string, field: string, value: string) => {
    setEdits((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const save = async (key: string) => {
    setSaving(key);
    setError(null);
    const entry = entries.find((e) => e.pageKey === key);
    const patch = edits[key] || {};
    const payload = {
      metaTitle: patch.metaTitle ?? entry?.metaTitle ?? "",
      metaDescription: patch.metaDescription ?? entry?.metaDescription ?? "",
      keywords: patch.keywords ?? (entry?.keywords ?? []).join(", "),
    };
    try {
      const r = await fetch(`/api/admin/page-seo/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      setEntries((prev) => prev.map((e) => (e.pageKey === key ? { ...e, ...d.data } : e)));
      setEdits((prev) => { const n = { ...prev }; delete n[key]; return n; });
      setSaved(key);
      setTimeout(() => setSaved(null), 2500);
    } catch (e: any) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Globe className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Page SEO</h1>
          <p className="text-sm text-gray-500">
            Manage meta title, description and keywords for each page
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        {entries.map((entry) => {
          const key = entry.pageKey;
          const isDirty = !!edits[key] && Object.keys(edits[key]).length > 0;
          const isSaving = saving === key;
          const isSaved = saved === key;

          return (
            <div
              key={key}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                <div>
                  <p className="font-semibold text-gray-900">{entry.pageLabel}</p>
                  <p className="text-xs text-gray-400">
                    /{key === "home" ? "" : key}
                  </p>
                </div>
                {entry.updatedAt && (
                  <p className="text-xs text-gray-400">
                    Updated {new Date(entry.updatedAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-semibold text-gray-700">
                      Meta Title
                    </label>
                    <span
                      className={`text-xs ${
                        getField(key, "metaTitle").length > 60
                          ? "text-red-500"
                          : "text-gray-400"
                      }`}
                    >
                      {getField(key, "metaTitle").length}/60
                    </span>
                  </div>
                  <input
                    type="text"
                    value={getField(key, "metaTitle")}
                    onChange={(e) => setField(key, "metaTitle", e.target.value)}
                    maxLength={60}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-semibold text-gray-700">
                      Meta Description
                    </label>
                    <span
                      className={`text-xs ${
                        getField(key, "metaDescription").length > 160
                          ? "text-red-500"
                          : "text-gray-400"
                      }`}
                    >
                      {getField(key, "metaDescription").length}/160
                    </span>
                  </div>
                  <textarea
                    value={getField(key, "metaDescription")}
                    onChange={(e) => setField(key, "metaDescription", e.target.value)}
                    maxLength={160}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Keywords{" "}
                    <span className="font-normal text-gray-400">(comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={getField(key, "keywords")}
                    onChange={(e) => setField(key, "keywords", e.target.value)}
                    placeholder="e.g., skin clinic, dermatologist, hair treatment"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    {isDirty && !isSaved && (
                      <p className="text-xs text-amber-600">● Unsaved changes</p>
                    )}
                    {isSaved && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Saved
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => save(key)}
                    disabled={isSaving || !isDirty}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                      isDirty
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    } disabled:opacity-60`}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
