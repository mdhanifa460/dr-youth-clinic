"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Save } from "lucide-react";

export default function PersonalizationSettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setEnabled(!!d.data?.personalizationEnabled);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save(next: boolean) {
    setEnabled(next);
    setSaving(true); setError(""); setSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalizationEnabled: next }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || "Save failed"); setEnabled(!next); return; }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Network error — please try again");
      setEnabled(!next);
    } finally {
      setSaving(false);
    }
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
            <h1 className="text-2xl font-bold text-[#0B2560]">Homepage Personalization</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Master switch for visitor-interest tracking. Off by default.
            </p>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-6">
            <CheckCircle size={14} /> Saved.
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* How it works */}
        <div className="flex items-start gap-3 bg-[#0B2560] text-white px-5 py-4 rounded-2xl mb-6">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="shrink-0 mt-0.5 opacity-80">
            <circle cx="7.5" cy="7.5" r="7" stroke="white" strokeWidth="1.2" />
            <rect x="7" y="6" width="1" height="5" rx="0.5" fill="white" />
            <rect x="7" y="4" width="1" height="1.2" rx="0.5" fill="white" />
          </svg>
          <p className="text-sm leading-relaxed opacity-90">
            This is the foundation of a larger feature (see the architecture
            note in app/lib/personalization.ts). Right now, turning this on
            only starts anonymous, non-PII interest tracking (currently:
            completed assessments, tagged by concern) — nothing on the
            homepage changes yet. The homepage itself only starts adapting
            once the scoring engine and section-level rules (weights,
            thresholds, per-section on/off, max categories, fallback
            content) are built and configured here — that's the next phase.
            Turning this off at any time stops all tracking immediately and
            existing tracked data is left untouched, not deleted.
          </p>
        </div>

        {/* Toggle */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-[#0B2560] text-sm">Visitor Interest Tracking</h2>
            <p className="text-gray-400 text-xs mt-0.5">Anonymous, cookie-based (no name/phone/email ever stored against it).</p>
          </div>
          <div className="px-6 py-5 flex items-start gap-4">
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={saving}
              onClick={() => save(!enabled)}
              className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/30 disabled:opacity-50 ${
                enabled ? "bg-[#0B2560]" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#0B2560]">
                Tracking is {enabled ? "ON" : "OFF"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {enabled
                  ? "Interest events are being recorded. Nothing is shown differently to visitors yet."
                  : "No interest events are recorded. Every /api/interest-events call is a silent no-op."}
              </p>
            </div>
            {saving && <Loader2 size={14} className="animate-spin text-gray-300 shrink-0" />}
          </div>
        </div>

      </div>
    </div>
  );
}
