"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Save } from "lucide-react";

// Mirrors app/admin/landing-pages/[id]/page.tsx's SECTION_LABELS exactly —
// this is the one other place that list needs to be known, so keep both in
// sync if a new section type is ever added there.
const SECTION_LABELS: Record<string, { label: string; icon: string }> = {
  hero: { label: 'Hero Banner', icon: '🖼️' },
  'trust-bar': { label: 'Trust Bar', icon: '⭐' },
  problem: { label: 'Problem Statement', icon: '⚠️' },
  solution: { label: 'Solution', icon: '✅' },
  benefits: { label: 'Benefits Grid', icon: '🏆' },
  'before-after': { label: 'Before & After', icon: '🔄' },
  process: { label: 'Process Timeline', icon: '📋' },
  doctor: { label: 'Doctor Profile', icon: '👨‍⚕️' },
  reviews: { label: 'Patient Reviews', icon: '💬' },
  'hair-timeline': { label: 'Hair Growth Timeline', icon: '📈' },
  'client-journey': { label: 'Client Progress Timeline', icon: '📸' },
  location: { label: 'Branch Locations', icon: '📍' },
  'video-explainer': { label: 'Video Explainer', icon: '🎬' },
  'offer-banner': { label: 'Offer Banner', icon: '🔥' },
  faq: { label: 'FAQ Accordion', icon: '❓' },
  comparison: { label: 'Comparison Table', icon: '⚖️' },
  guarantee: { label: 'Our Guarantee', icon: '🏆' },
  cta: { label: 'CTA Section', icon: '📣' },
  form: { label: 'Lead Form', icon: '📝' },
};

type LandingPageFormSettings = { requiredSections: string[] };
const DEFAULTS: LandingPageFormSettings = { requiredSections: ['hero', 'form'] };

export default function LandingPageFormSettingsPage() {
  const [form, setForm] = useState<LandingPageFormSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.landingPageForm) {
          setForm({ ...DEFAULTS, ...d.data.landingPageForm });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggle = (type: string) => {
    setForm((f) => ({
      requiredSections: f.requiredSections.includes(type)
        ? f.requiredSections.filter((t) => t !== type)
        : [...f.requiredSections, type],
    }));
  };

  async function save() {
    setSaving(true); setError(""); setSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landingPageForm: form }),
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f6faff]">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6faff]">
      <div className="max-w-2xl mx-auto px-6 py-10">

        <Link href="/admin/settings" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0B2560] transition mb-6">
          <ArrowLeft size={14} /> Settings
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2560]">Landing Page Form</h1>
            <p className="text-gray-400 text-sm mt-0.5">Choose which section types must be present before a landing page can be published.</p>
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

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-[#0B2560] text-sm">Required Sections</h2>
            <p className="text-gray-400 text-xs mt-0.5">Every other section type stays optional — an editor can still add any of them freely, they just aren't required before going live.</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-gray-50 border-t border-gray-50">
            {Object.entries(SECTION_LABELS).map(([type, meta]) => {
              const isRequired = form.requiredSections.includes(type);
              return (
                <label key={type} className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition">
                  <input type="checkbox" checked={isRequired} onChange={() => toggle(type)} className="rounded" />
                  <span>{meta.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{meta.label}</span>
                </label>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
