"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Save } from "lucide-react";

type BrandSettings = {
  tagline: string;
  primaryColor: string;
  instagram: string;
  facebook: string;
  youtube: string;
  googleBusiness: string;
  whatsappCta: string;
};

const DEFAULTS: BrandSettings = {
  tagline: "Your Skin's Best Friend",
  primaryColor: "#0B2560",
  instagram: "",
  facebook: "",
  youtube: "",
  googleBusiness: "",
  whatsappCta: "",
};

const SOCIAL_FIELDS: { key: keyof BrandSettings; label: string; placeholder: string; icon: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "instagram.com/dryouthclinic", icon: "📸" },
  { key: "facebook", label: "Facebook", placeholder: "facebook.com/dryouth", icon: "🔵" },
  { key: "youtube", label: "YouTube", placeholder: "YouTube channel URL", icon: "▶️" },
  { key: "googleBusiness", label: "Google Business", placeholder: "Google Business Profile URL", icon: "🔍" },
];


export default function BrandSettingsPage() {
  const [form, setForm] = useState<BrandSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.brand) setForm({ ...DEFAULTS, ...d.data.brand });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function set<K extends keyof BrandSettings>(key: K, val: BrandSettings[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    setSaving(true); setError(""); setSuccess(false);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand: form }),
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
            <h1 className="text-2xl font-bold text-[#0B2560]">Brand & Identity</h1>
            <p className="text-gray-400 text-sm mt-0.5">Manage your clinic's tagline, brand colour, and social links.</p>
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

        {/* Clinic Identity */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-[#0B2560] text-sm">Clinic Identity</h2>
            <p className="text-gray-400 text-xs mt-0.5">Your clinic's tagline and primary brand colour.</p>
          </div>
          <div className="px-6 py-5 space-y-5">

            {/* Tagline */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tagline</label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => set("tagline", e.target.value)}
                placeholder="Your Skin's Best Friend"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] focus:ring-1 focus:ring-[#0B2560]/20"
              />
            </div>

            {/* Primary Brand Colour */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Primary Brand Colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => set("primaryColor", e.target.value)}
                  className="w-11 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5 bg-white"
                />
                <input
                  type="text"
                  value={form.primaryColor}
                  onChange={(e) => set("primaryColor", e.target.value)}
                  placeholder="#0B2560"
                  className="w-32 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] focus:ring-1 focus:ring-[#0B2560]/20 font-mono"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Social Media Links */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-[#0B2560] text-sm">Social Media Links</h2>
            <p className="text-gray-400 text-xs mt-0.5">These links appear in the website footer and contact sections.</p>
          </div>
          <div className="divide-y divide-gray-50">
            {SOCIAL_FIELDS.map(({ key, label, placeholder, icon }) => (
              <div key={key} className="px-6 py-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1.5">
                  <span>{icon}</span> {label}
                </label>
                <input
                  type="url"
                  value={form[key] as string}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] focus:ring-1 focus:ring-[#0B2560]/20"
                />
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp CTA */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-[#0B2560] text-sm">WhatsApp CTA</h2>
            <p className="text-gray-400 text-xs mt-0.5">Phone number for the floating WhatsApp button.</p>
          </div>
          <div className="px-6 py-5">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              WhatsApp Number <span className="font-normal">(with country code)</span>
            </label>
            <input
              type="tel"
              value={form.whatsappCta}
              onChange={(e) => set("whatsappCta", e.target.value)}
              placeholder="919876543210"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] focus:ring-1 focus:ring-[#0B2560]/20 font-mono"
            />
            <p className="text-[11px] text-gray-400 mt-1.5">
              This number appears on the floating WhatsApp button across the entire website. No spaces, no + sign — e.g. 919876543210
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
