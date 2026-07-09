"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Save, Phone, Mail, MessageCircle, Shield } from "lucide-react";
import { ALL_ROLES as ADMIN_ROLES, ROLE_LABELS } from "@/app/lib/permissions";

const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin:       "Full platform access",
  clinic_owner:      "Manages own clinic(s)",
  marketing_manager: "Leads & campaigns",
  doctor:            "Sees own appointments",
  receptionist:      "Front desk, bookings",
  content_editor:    "Blog & content only",
  finance_manager:   "Pricing & payments",
  customer_support:  "Patient queries",
};

// Real, current admin roles only (previously included a "clinic_manager" role that
// doesn't exist in app/lib/permissions.ts and could never actually match a logged-in user).
const ALL_ROLES = ADMIN_ROLES.map((key) => ({
  key,
  label: ROLE_LABELS[key].replace(/^\S+\s/, ''), // strip the emoji prefix used elsewhere
  desc: ROLE_DESCRIPTIONS[key] ?? '',
}));

type ContactForm = {
  publicPhone:    string;
  publicWhatsApp: string;
  publicEmail:    string;
};

const CONTACT_DEFAULTS: ContactForm = {
  publicPhone:    "",
  publicWhatsApp: "",
  publicEmail:    "",
};

export default function ContactSettingsPage() {
  const [contact,      setContact]      = useState<ContactForm>(CONTACT_DEFAULTS);
  const [phoneRoles,   setPhoneRoles]   = useState<string[]>(["super_admin", "clinic_owner", "receptionist", "customer_support"]);
  const [maskEnabled,  setMaskEnabled]  = useState(true);
  const [maskSaving,   setMaskSaving]   = useState(false);
  const [maskError,    setMaskError]    = useState("");
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [success,      setSuccess]      = useState(false);
  const [error,        setError]        = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          if (d.data?.contact)        setContact({ ...CONTACT_DEFAULTS, ...d.data.contact });
          if (d.data?.contactPrivacy?.showPatientPhoneRoles) {
            setPhoneRoles(d.data.contactPrivacy.showPatientPhoneRoles);
          }
          if (typeof d.data?.contactPrivacy?.phoneMaskEnabled === "boolean") {
            setMaskEnabled(d.data.contactPrivacy.phoneMaskEnabled);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function toggleRole(key: string) {
    setPhoneRoles((prev) =>
      prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]
    );
  }

  // Saves independently of the page's main Save button — editable by super_admin
  // and clinic_owner, a narrower carve-out than the full Settings permission that
  // gates the rest of this page (see app/api/admin/settings/phone-mask/route.ts).
  async function toggleMaskEnabled() {
    const next = !maskEnabled;
    setMaskEnabled(next);
    setMaskSaving(true);
    setMaskError("");
    try {
      const res = await fetch("/api/admin/settings/phone-mask", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json();
      if (!data.success) {
        setMaskEnabled(!next);
        setMaskError(data.message || "Failed to save");
      }
    } catch {
      setMaskEnabled(!next);
      setMaskError("Network error — please try again");
    } finally {
      setMaskSaving(false);
    }
  }

  async function save() {
    setSaving(true); setError(""); setSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact,
          // Include phoneMaskEnabled even though this form doesn't edit it directly —
          // the generic settings PUT does a $set on the whole contactPrivacy object,
          // which would otherwise silently wipe the value set via the dedicated toggle.
          contactPrivacy: { showPatientPhoneRoles: phoneRoles, phoneMaskEnabled: maskEnabled },
        }),
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

  return (
    <div className="min-h-screen bg-[#f6faff]">
      <div className="max-w-2xl mx-auto px-6 py-10">

        <Link href="/admin/settings" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0B2560] transition mb-6">
          <ArrowLeft size={14} /> Settings
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2560]">Contact & Privacy</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Set public-facing contact details and control which roles can see patient phone numbers.
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
            <CheckCircle size={14} /> Settings saved
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Public Contact Details */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-[#0B2560] text-sm">Public Contact Details</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              Shown on the website Navbar, FAQ page, skin quiz, booking sidebar, and JSON-LD schema.
            </p>
          </div>
          <div className="px-6 py-5 space-y-5">

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5">
                <Phone size={12} /> Phone Number
              </label>
              <input
                type="tel"
                value={contact.publicPhone}
                onChange={(e) => setContact((f) => ({ ...f, publicPhone: e.target.value }))}
                placeholder="1800 890 9669"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] focus:ring-1 focus:ring-[#0B2560]/20 font-mono"
              />
              <p className="text-[11px] text-gray-400 mt-1.5">
                Displayed in the Navbar and booking sidebar. Leave blank to hide the phone link entirely.
              </p>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5">
                <MessageCircle size={12} /> WhatsApp Number
              </label>
              <input
                type="tel"
                value={contact.publicWhatsApp}
                onChange={(e) => setContact((f) => ({ ...f, publicWhatsApp: e.target.value }))}
                placeholder="919876543210"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] focus:ring-1 focus:ring-[#0B2560]/20 font-mono"
              />
              <p className="text-[11px] text-gray-400 mt-1.5">
                Used for WhatsApp CTA links on the FAQ and skin quiz results pages. Digits only with country code, e.g. 919876543210.
              </p>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5">
                <Mail size={12} /> Email Address
              </label>
              <input
                type="email"
                value={contact.publicEmail}
                onChange={(e) => setContact((f) => ({ ...f, publicEmail: e.target.value }))}
                placeholder="hello@dryouthclinic.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] focus:ring-1 focus:ring-[#0B2560]/20"
              />
            </div>

          </div>
        </div>

        {/* Patient Phone Visibility */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-[#0B2560]" />
                <h2 className="font-bold text-[#0B2560] text-sm">Patient Phone Visibility</h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <span className="text-xs font-semibold text-gray-500">
                  {maskSaving ? "Saving…" : maskEnabled ? "Masking On" : "Masking Off"}
                </span>
                <div className="relative" onClick={toggleMaskEnabled}>
                  <div className={`w-10 h-6 rounded-full transition-colors ${maskEnabled ? "bg-[#0B2560]" : "bg-gray-200"}`} />
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${maskEnabled ? "translate-x-4" : ""}`} />
                </div>
              </label>
            </div>
            <p className="text-gray-400 text-xs mt-0.5">
              Master switch for phone masking in Leads, Appointments, and Bookings — editable by Super Admin and Clinic Owner.
              {!maskEnabled && " Currently off: everyone sees full, unmasked numbers regardless of the roles below."}
            </p>
            {maskError && (
              <p className="text-red-600 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={11} /> {maskError}</p>
            )}
          </div>
          <div className={`divide-y divide-gray-50 transition-opacity ${maskEnabled ? "" : "opacity-40 pointer-events-none"}`}>
            {ALL_ROLES.map(({ key, label, desc }) => {
              const checked = phoneRoles.includes(key);
              return (
                <label key={key} className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 transition">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                  <div className="relative shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleRole(key)}
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${checked ? "bg-[#0B2560]" : "bg-gray-200"}`} />
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
                  </div>
                </label>
              );
            })}
          </div>
          <div className="px-6 py-4 border-t border-gray-50 bg-gray-50/50">
            <p className="text-[11px] text-gray-400">
              Super Admin and Clinic Owner always have access to unmasked numbers when exporting leads via the secure export feature, regardless of this setting.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
