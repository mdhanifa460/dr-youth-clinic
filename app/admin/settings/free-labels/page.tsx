"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Save } from "lucide-react";

type FreeLabelSettings = {
  consultationFree: boolean;
  skinQuizFree: boolean;
};

const DEFAULTS: FreeLabelSettings = {
  consultationFree: true,
  skinQuizFree: true,
};

function Toggle({
  checked,
  onChange,
  label,
  description,
  preview,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
  preview: { on: string; off: string };
}) {
  return (
    <div className="px-6 py-5 flex items-start gap-4">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/30 ${
          checked ? "bg-[#0B2560]" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#0B2560]">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Preview:</span>
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
              checked
                ? "bg-[#0B2560] text-white border-[#0B2560]"
                : "bg-gray-50 text-gray-500 border-gray-200"
            }`}
          >
            {checked ? preview.on : preview.off}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function FreeLabelsSettingsPage() {
  const [form, setForm] = useState<FreeLabelSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.freeLabels) setForm({ ...DEFAULTS, ...d.data.freeLabels });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true); setError(""); setSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freeLabels: form }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || "Save failed"); return; }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#f6faff]">
      <Loader2 size={24} className="animate-spin text-gray-300" />
    </div>
  );

  const consultationCta = form.consultationFree ? "Book Free Consultation" : "Book Consultation";
  const skinQuizLabel   = form.skinQuizFree    ? "✨ Free Quiz"             : "✨ Quiz";

  return (
    <div className="min-h-screen bg-[#f6faff]">
      <div className="max-w-2xl mx-auto px-6 py-10">

        <Link href="/admin/settings" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0B2560] transition mb-6">
          <ArrowLeft size={14} /> Settings
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2560]">Free Label Controls</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Toggle whether CTAs across the website say "Free" or not — one switch, all pages.
            </p>
          </div>
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition disabled:opacity-50 shadow-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-6">
            <CheckCircle size={14} /> Settings saved — website CTAs updated.
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
            Toggling OFF removes the word "Free" from all CTAs site-wide — useful when running paid consultations
            or launching a new pricing model. Changes take effect within 5 minutes (cached).
          </p>
        </div>

        {/* Toggles */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-[#0B2560] text-sm">CTA Labels</h2>
            <p className="text-gray-400 text-xs mt-0.5">Controls button text on every page of the website.</p>
          </div>
          <div className="divide-y divide-gray-50">
            <Toggle
              checked={form.consultationFree}
              onChange={(v) => setForm((f) => ({ ...f, consultationFree: v }))}
              label="Free Consultation"
              description='Affects: Navbar, service pages, doctors pages, blog CTAs, About page, EligibilityChecker. All "Book Free Consultation" buttons.'
              preview={{ on: consultationCta, off: "Book Consultation" }}
            />
            <Toggle
              checked={form.skinQuizFree}
              onChange={(v) => setForm((f) => ({ ...f, skinQuizFree: v }))}
              label="Free Quiz"
              description='Affects: Navbar quiz button, footer link, quiz intro page, trust badges.'
              preview={{ on: skinQuizLabel, off: "✨ Quiz" }}
            />
          </div>
        </div>

        {/* Live site preview */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-[#0B2560] text-sm">Live Preview</h2>
            <p className="text-gray-400 text-xs mt-0.5">How buttons will appear across the website.</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Navbar (desktop)</span>
              <span className="text-xs font-semibold border border-[#F5A623] text-[#0B2560] px-3 py-1 rounded-lg">
                {skinQuizLabel}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Booking page hero</span>
              <span className="text-xs font-bold bg-[#0B2560] text-white px-3 py-1 rounded-lg">
                {consultationCta}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Service page CTA</span>
              <span className="text-xs font-bold bg-[#0B2560] text-white px-3 py-1 rounded-lg">
                {consultationCta}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Footer link</span>
              <span className="text-xs font-semibold text-[#F5A623]">
                {skinQuizLabel}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
