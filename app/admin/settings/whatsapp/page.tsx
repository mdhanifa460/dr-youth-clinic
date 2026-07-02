"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  Save,
  MessageCircle,
  Bell,
  Heart,
  Star,
  RefreshCw,
} from "lucide-react";

type WhatsappSettings = {
  bookingConfirmation: string;
  appointmentReminder: string;
  postTreatmentFollowup: string;
  reviewRequest: string;
  reEngagement: string;
};

const DEFAULTS: WhatsappSettings = {
  bookingConfirmation:
    "Hello {{name}}! 🌟 Your appointment at DR Youth Clinic has been requested.\n\n📅 Treatment: {{service}}\n📍 Location: {{location}}\n\nOur team will call you within 2 hours to confirm your slot. For any queries, reply here.\n\n— DR Youth Clinic ✨",
  appointmentReminder:
    "Hi {{name}}! 👋 Reminder — your appointment is tomorrow at DR Youth Clinic.\n\n📅 Treatment: {{service}}\n📍 Location: {{location}}\n\nPlease arrive 10 minutes early. Need to reschedule? Reply here.\n\n— DR Youth Clinic ✨",
  postTreatmentFollowup:
    "Hi {{name}}! 😊 We hope your {{service}} session went well!\n\nHow are you feeling? Share any concerns with us — our team is here.\n\n💧 Remember your post-care routine as advised by your doctor.\n\n— DR Youth Clinic ✨",
  reviewRequest:
    "Hi {{name}}! ⭐ Thank you for visiting DR Youth Clinic!\n\nCould you spare 2 minutes to leave us a Google review? It helps other patients find us.\n\n👉 {{googleReviewLink}}\n\nThank you! — DR Youth Clinic ✨",
  reEngagement:
    "Hi {{name}}! 💫 We miss you at DR Youth Clinic!\n\nIt's been a while since your last visit. Your skin deserves consistent care!\n\n🎁 Reply COMEBACK for your exclusive loyalty discount.\n\n— DR Youth Clinic ✨",
};

type TemplateKey = keyof WhatsappSettings;

type TemplateMeta = {
  key: TemplateKey;
  title: string;
  description: string;
  variables: string[];
  color: string;
  iconBg: string;
  iconColor: string;
  Icon: React.ElementType;
};

const TEMPLATES: TemplateMeta[] = [
  {
    key: "bookingConfirmation",
    title: "Booking Confirmation",
    description: "Sent automatically after a patient submits a booking request",
    variables: ["{{name}}", "{{service}}", "{{location}}"],
    color: "green",
    iconBg: "bg-green-50",
    iconColor: "text-green-500",
    Icon: MessageCircle,
  },
  {
    key: "appointmentReminder",
    title: "Appointment Reminder",
    description: "Sent 24 hours before the scheduled appointment",
    variables: ["{{name}}", "{{service}}", "{{location}}"],
    color: "blue",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
    Icon: Bell,
  },
  {
    key: "postTreatmentFollowup",
    title: "Post-Treatment Follow-up",
    description: "Sent 3 days after a completed appointment",
    variables: ["{{name}}", "{{service}}"],
    color: "violet",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-500",
    Icon: Heart,
  },
  {
    key: "reviewRequest",
    title: "Review Request",
    description: "Sent after a completed appointment to collect Google reviews",
    variables: ["{{name}}", "{{googleReviewLink}}"],
    color: "amber",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    Icon: Star,
  },
  {
    key: "reEngagement",
    title: "Re-engagement",
    description: "Sent to patients who haven't visited in 90+ days",
    variables: ["{{name}}"],
    color: "rose",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-500",
    Icon: RefreshCw,
  },
];

export default function WhatsappSettingsPage() {
  const [form, setForm] = useState<WhatsappSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.whatsapp) setForm({ ...DEFAULTS, ...d.data.whatsapp });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function setField(key: TemplateKey, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: form }),
      });
      const data = await res.json();
      setSaving(false);
      if (!data.success) {
        setError(data.message || "Save failed");
        return;
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setSaving(false);
      setError("An unexpected error occurred");
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

        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0B2560] transition mb-6"
        >
          <ArrowLeft size={14} /> Settings
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2560]">WhatsApp Templates</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Manage message templates for patient communications.
            </p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition disabled:opacity-50 shadow-sm"
          >
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

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 text-blue-700 text-sm px-4 py-3.5 rounded-xl mb-6">
          <AlertCircle size={15} className="shrink-0 mt-0.5 text-blue-400" />
          <p className="leading-relaxed">
            These are message templates. Copy them into your WhatsApp Business automation tool (WATI, AiSensy, or Interakt). Variables in{" "}
            <span className="font-mono font-semibold">{"{{curly braces}}"}</span> are replaced automatically.
          </p>
        </div>

        {/* Template cards */}
        {TEMPLATES.map(({ key, title, description, variables, iconBg, iconColor, Icon }) => (
          <div key={key} className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
            {/* Card header */}
            <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
              <div className={`${iconBg} ${iconColor} p-2 rounded-xl shrink-0`}>
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-[#0B2560] text-sm">{title}</h2>
                <p className="text-gray-400 text-xs mt-0.5">{description}</p>
              </div>
            </div>

            {/* Card body */}
            <div className="px-6 py-5">
              <textarea
                rows={6}
                value={form[key]}
                onChange={(e) => setField(key, e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0B2560] resize-none font-mono leading-relaxed"
              />

              {/* Footer row */}
              <div className="flex items-center justify-between mt-2.5 flex-wrap gap-2">
                {/* Variable chips */}
                <div className="flex items-center flex-wrap gap-1.5">
                  {variables.map((v) => (
                    <span
                      key={v}
                      className="bg-gray-100 text-gray-500 text-[10px] font-mono px-2 py-0.5 rounded-full"
                    >
                      {v}
                    </span>
                  ))}
                </div>
                {/* Character count */}
                <span className="text-[11px] text-gray-400 shrink-0">
                  {form[key].length} characters
                </span>
              </div>
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
