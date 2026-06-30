"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Save } from "lucide-react";

type BookingSettings = {
  collectEmail: boolean;
  collectAge: boolean;
  collectConcern: boolean;
  collectPreferredDoctor: boolean;
  requirePhone: boolean;
  whatsappNotify: boolean;
  clinicWhatsapp: string;
  consultationDuration: number;
};

const DEFAULTS: BookingSettings = {
  collectEmail: true,
  collectAge: false,
  collectConcern: true,
  collectPreferredDoctor: false,
  requirePhone: true,
  whatsappNotify: true,
  clinicWhatsapp: "",
  consultationDuration: 30,
};

const PATIENT_FIELDS: { key: keyof BookingSettings; label: string; desc: string; badge?: string }[] = [
  { key: "requirePhone", label: "Phone Number", desc: "Patient's mobile number — used for WhatsApp confirmation.", badge: "Required" },
  { key: "collectEmail", label: "Email Address", desc: "Collected for email confirmation and future follow-ups." },
  { key: "collectConcern", label: "Main Concern", desc: "A short text field for the patient to describe their skin/hair issue." },
  { key: "collectAge", label: "Age", desc: "Patient age — helps doctors prepare the right protocol." },
  { key: "collectPreferredDoctor", label: "Preferred Doctor", desc: "Let patients choose a doctor from your team when booking." },
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex shrink-0 items-center rounded-full transition-colors ${on ? "bg-[#0B2560]" : "bg-gray-200"}`}
      style={{ width: 44, height: 24 }}
    >
      <span
        className="inline-block bg-white rounded-full shadow transition-transform"
        style={{ width: 18, height: 18, transform: on ? "translateX(22px)" : "translateX(3px)" }}
      />
    </button>
  );
}

export default function BookingSettingsPage() {
  const [form, setForm] = useState<BookingSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.booking) setForm({ ...DEFAULTS, ...d.data.booking });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function set<K extends keyof BookingSettings>(key: K, val: BookingSettings[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    setSaving(true); setError(""); setSuccess(false);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking: form }),
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
            <h1 className="text-2xl font-bold text-[#0B2560]">Booking & Notifications</h1>
            <p className="text-gray-400 text-sm mt-0.5">Configure what patients fill in and how you get notified.</p>
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

        {/* Patient form fields */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-[#0B2560] text-sm">Patient Booking Form</h2>
            <p className="text-gray-400 text-xs mt-0.5">Choose which information patients provide when they request a consultation.</p>
          </div>
          <div className="divide-y divide-gray-50">
            {PATIENT_FIELDS.map(({ key, label, desc, badge }) => (
              <div key={key} className="flex items-center justify-between px-6 py-4 gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-700">{label}</p>
                    {badge && <span className="text-[10px] font-bold bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">{badge}</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
                <Toggle on={form[key] as boolean} onChange={() => key !== "requirePhone" && set(key, !form[key])} />
              </div>
            ))}
          </div>
        </div>

        {/* Consultation duration */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-[#0B2560] text-sm">Consultation Duration</h2>
            <p className="text-gray-400 text-xs mt-0.5">Default duration shown in booking confirmations.</p>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 flex-wrap">
              {[15, 20, 30, 45, 60].map((d) => (
                <button key={d} type="button"
                  onClick={() => set("consultationDuration", d)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                    form.consultationDuration === d
                      ? "bg-[#0B2560] text-white border-[#0B2560]"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}>{d} min</button>
              ))}
              <input type="number" min={5} max={120}
                value={form.consultationDuration}
                onChange={(e) => set("consultationDuration", +e.target.value)}
                className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-[#0B2560]" />
            </div>
          </div>
        </div>

        {/* WhatsApp notifications */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-[#0B2560] text-sm">WhatsApp Notifications</h2>
            <p className="text-gray-400 text-xs mt-0.5">Send a WhatsApp message to the clinic number on every new booking.</p>
          </div>
          <div className="px-6 py-5 space-y-5">

            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Enable WhatsApp Notifications</p>
                <p className="text-xs text-gray-400 mt-0.5">Clinic receives a WhatsApp message for each new booking request.</p>
              </div>
              <Toggle on={form.whatsappNotify} onChange={() => set("whatsappNotify", !form.whatsappNotify)} />
            </div>

            {/* Phone number input */}
            {form.whatsappNotify && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Clinic WhatsApp Number <span className="font-normal">(with country code)</span>
                </label>
                <input
                  type="tel"
                  value={form.clinicWhatsapp}
                  onChange={(e) => set("clinicWhatsapp", e.target.value)}
                  placeholder="918526573032"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] focus:ring-1 focus:ring-[#0B2560]/20 font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1">No spaces, no + sign — e.g. 919876543210</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
