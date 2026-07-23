"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, X, ChevronLeft, ChevronRight, RefreshCw,
  MessageCircle, Phone, Calendar, ArrowRight, AlertCircle,
  CheckCircle, Clock, TrendingUp, Users, Loader2, Edit2,
  IndianRupee, Filter, Download, Plus, History, StickyNote,
  Info, Repeat2,
} from "lucide-react";
import type { AdminRole } from "@/app/lib/permissions";

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingStatus =
  | "new" | "contacted" | "follow_up" | "confirmed"
  | "arrived" | "completed" | "no_show" | "cancelled";

type BookingSource =
  | "website" | "instagram" | "facebook" | "google"
  | "referral" | "walk_in" | "phone" | "whatsapp" | "other";

interface Booking {
  _id: string;
  bookingId?: string;
  name: string;
  phone: string;
  email?: string;
  service?: string;
  location?: string;
  date?: string;
  time?: string;
  concern?: string;
  status: BookingStatus;
  source?: BookingSource;
  internalNote?: string;
  treatmentValue?: number;
  isReturnVisit?: boolean;
  assignedTo?: string;
  contactedAt?: string;
  convertedToAppointmentId?: string;
  promoCode?: string;
  promoDiscount?: number;
  createdAt: string;
}

interface Stats {
  byStatus: Record<string, number>;
  todayNew: number;
  pipelineValue: number;
  pipelineCount: number;
  avgResponseHours: number | null;
  sourceBreakdown: Record<string, number>;
  total: number;
}

interface Doctor { _id: string; name: string; locations: string[] }

interface Props {
  userRole: AdminRole;
  assignedClinics: string[];
  doctors: Doctor[];
}

// ─── Static data ──────────────────────────────────────────────────────────────

const STATUS_META: Record<BookingStatus, { label: string; dot: string; badge: string; icon: string }> = {
  new:        { label: "New Lead",   dot: "bg-blue-500",    badge: "bg-blue-50 text-blue-700 border-blue-200",       icon: "📥" },
  contacted:  { label: "Contacted",  dot: "bg-violet-500",  badge: "bg-violet-50 text-violet-700 border-violet-200", icon: "📞" },
  follow_up:  { label: "Follow Up",  dot: "bg-amber-500",   badge: "bg-amber-50 text-amber-700 border-amber-200",    icon: "🔄" },
  confirmed:  { label: "Confirmed",  dot: "bg-green-500",   badge: "bg-green-50 text-green-700 border-green-200",    icon: "✅" },
  arrived:    { label: "Arrived",    dot: "bg-teal-500",    badge: "bg-teal-50 text-teal-700 border-teal-200",       icon: "🏥" },
  completed:  { label: "Completed",  dot: "bg-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "🎉" },
  no_show:    { label: "No Show",    dot: "bg-red-500",     badge: "bg-red-50 text-red-700 border-red-200",          icon: "❌" },
  cancelled:  { label: "Cancelled",  dot: "bg-gray-400",    badge: "bg-gray-50 text-gray-500 border-gray-200",       icon: "🚫" },
};

const SOURCE_META: Record<string, { label: string; icon: string; color: string }> = {
  website:   { label: "Website",    icon: "🌐", color: "bg-blue-50 text-blue-600"    },
  instagram: { label: "Instagram",  icon: "📸", color: "bg-pink-50 text-pink-600"    },
  facebook:  { label: "Facebook",   icon: "🔵", color: "bg-indigo-50 text-indigo-600"},
  google:    { label: "Google",     icon: "🔍", color: "bg-yellow-50 text-yellow-700"},
  referral:  { label: "Referral",   icon: "👥", color: "bg-green-50 text-green-600"  },
  walk_in:   { label: "Walk-in",    icon: "🚶", color: "bg-orange-50 text-orange-600"},
  phone:     { label: "Phone Call", icon: "📞", color: "bg-gray-50 text-gray-600"    },
  whatsapp:  { label: "WhatsApp",   icon: "💬", color: "bg-emerald-50 text-emerald-600"},
  just_dial: { label: "Just Dial",  icon: "📇", color: "bg-red-50 text-red-600"       },
  other:     { label: "Other",      icon: "📌", color: "bg-gray-50 text-gray-500"    },
};

const SERVICES    = ["Skin", "Hair", "Laser", "Other"];
const LOCATIONS   = ["Chennai", "Bangalore", "Kochi", "Coimbatore"];
const PIPELINE_STATUSES: BookingStatus[] = ["new","contacted","follow_up","confirmed","arrived","completed"];
const ALL_STATUSES: BookingStatus[] = ["new","contacted","follow_up","confirmed","arrived","completed","no_show","cancelled"];

function fmtINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BookingStatus }) {
  const m = STATUS_META[status] || STATUS_META.new;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${m.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  const cards = [
    {
      label: "New Today",
      value: loading ? "—" : String(stats?.todayNew ?? 0),
      icon: <Plus size={16} className="text-blue-600" />,
      bg: "bg-blue-50",
      sub: "leads submitted",
    },
    {
      label: "Confirmed",
      value: loading ? "—" : String(stats?.byStatus?.confirmed ?? 0),
      icon: <CheckCircle size={16} className="text-green-600" />,
      bg: "bg-green-50",
      sub: "slots locked in",
    },
    {
      label: "Pipeline",
      value: loading ? "—" : fmtINR(stats?.pipelineValue ?? 0),
      icon: <IndianRupee size={16} className="text-violet-600" />,
      bg: "bg-violet-50",
      sub: `${stats?.pipelineCount ?? 0} confirmed bookings`,
    },
    {
      label: "Avg Response",
      value: loading ? "—" : stats?.avgResponseHours != null ? `${stats.avgResponseHours}h` : "N/A",
      icon: <Clock size={16} className="text-amber-600" />,
      bg: "bg-amber-50",
      sub: "time to first contact",
    },
    {
      label: "Total Leads",
      value: loading ? "—" : String(stats?.total ?? 0),
      icon: <Users size={16} className="text-gray-600" />,
      bg: "bg-gray-50",
      sub: "all time",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {cards.map((c) => (
        <div key={c.label} className={`${c.bg} rounded-2xl p-4 border border-white shadow-sm`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{c.label}</span>
            {c.icon}
          </div>
          <p className="text-2xl font-bold text-gray-800 leading-none">{c.value}</p>
          <p className="text-[11px] text-gray-400 mt-1">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Status Pipeline row ──────────────────────────────────────────────────────

function PipelineBar({ current, onChange, saving }: {
  current: BookingStatus;
  onChange: (s: BookingStatus) => void;
  saving: boolean;
}) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Status Pipeline</p>
      <div className="flex items-center gap-1 flex-wrap">
        {PIPELINE_STATUSES.map((s, i) => {
          const m = STATUS_META[s];
          const isActive = s === current;
          const isPast   = PIPELINE_STATUSES.indexOf(current) > i;
          return (
            <div key={s} className="flex items-center gap-1">
              <button
                onClick={() => onChange(s)}
                disabled={saving}
                title={m.label}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all
                  ${isActive ? `${m.badge} shadow-sm ring-1 ring-current` : isPast ? "bg-gray-50 text-gray-400 border-gray-100" : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"}
                `}
              >
                {m.icon} {m.label}
              </button>
              {i < PIPELINE_STATUSES.length - 1 && (
                <ChevronRight size={10} className="text-gray-300 shrink-0" />
              )}
            </div>
          );
        })}
        {/* Special statuses */}
        <div className="flex gap-1 ml-2 pl-2 border-l border-gray-200">
          {(["no_show","cancelled"] as BookingStatus[]).map((s) => {
            const m = STATUS_META[s];
            return (
              <button key={s} onClick={() => onChange(s)} disabled={saving} title={m.label}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all
                  ${s === current ? `${m.badge} shadow-sm ring-1 ring-current` : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"}
                `}
              >
                {m.icon} {m.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Convert to Appointment Modal ─────────────────────────────────────────────

function ConvertModal({
  booking, doctors, onClose, onSuccess,
}: {
  booking: Booking;
  doctors: Doctor[];
  onClose: () => void;
  onSuccess: (appointmentId: string) => void;
}) {
  const branchLower = (booking.location || "").toLowerCase();
  const branchDoctors = doctors.filter(
    (d) => d.locations.includes("all") || d.locations.some((l) => l.toLowerCase() === branchLower)
  );

  const [form, setForm] = useState({
    doctorId: "",
    doctorName: "",
    date: "",
    startTime: "",
    durationMinutes: "30",
    appointmentType: "consultation" as "consultation" | "treatment" | "follow_up" | "patch_test",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const [conflict, setConflict] = useState(false);

  function setField(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setConflict(false);
    setError("");
  }

  async function submit() {
    if (!form.doctorId || !form.date || !form.startTime) {
      setError("Doctor, date and time are required."); return;
    }
    setSaving(true); setError("");
    const res = await fetch(`/api/admin/bookings/${booking._id}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctorId:       form.doctorId,
        doctorName:     form.doctorName,
        date:           form.date,
        startTime:      form.startTime,
        durationMinutes: Number(form.durationMinutes),
        appointmentType: form.appointmentType,
        branch:         booking.location,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      onSuccess(data.appointment.appointmentId);
    } else {
      setConflict(!!data.conflict);
      setError(data.message || "Conversion failed.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-[#0B2560]">Convert to Appointment</h3>
            <p className="text-xs text-gray-400 mt-0.5">For {booking.name} · {booking.service}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className={`flex items-start gap-2 text-sm px-3 py-2.5 rounded-xl border ${conflict ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-red-50 border-red-100 text-red-600"}`}>
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Doctor *</label>
            <select
              value={form.doctorId}
              onChange={(e) => {
                const d = branchDoctors.find((x) => x._id === e.target.value);
                setField("doctorId", e.target.value);
                setForm((f) => ({ ...f, doctorName: d?.name || "" }));
              }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B2560]"
            >
              <option value="">Select doctor…</option>
              {branchDoctors.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
            {branchDoctors.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No doctors assigned to {booking.location}. All doctors shown.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Date *</label>
              <input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B2560]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Start Time *</label>
              <input type="time" value={form.startTime} onChange={(e) => setField("startTime", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B2560]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Duration (min)</label>
              <select value={form.durationMinutes} onChange={(e) => setField("durationMinutes", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B2560]">
                {[15,20,30,45,60,90,120].map((m) => <option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Type</label>
              <select value={form.appointmentType} onChange={(e) => setField("appointmentType", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B2560]">
                <option value="consultation">Consultation</option>
                <option value="treatment">Treatment</option>
                <option value="follow_up">Follow-up</option>
                <option value="patch_test">Patch Test</option>
              </select>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            className="flex-1 bg-[#0B2560] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0d2d72] transition flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
            Create Appointment
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Right Drawer ─────────────────────────────────────────────────────────────

function BookingDrawer({
  booking, onClose, onUpdate, doctors,
}: {
  booking: Booking;
  onClose: () => void;
  onUpdate: (updated: Partial<Booking>) => void;
  doctors: Doctor[];
}) {
  const [tab,        setTab]        = useState<"details"|"notes"|"history">("details");
  const [status,     setStatusVal]  = useState<BookingStatus>(booking.status);
  const [note,       setNote]       = useState(booking.internalNote || "");
  const [value,      setValue]      = useState(String(booking.treatmentValue || ""));
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNote,   setSavingNote]   = useState(false);
  const [history,    setHistory]    = useState<{ bookings: any[]; appointments: any[]; totalVisits: number } | null>(null);
  const [histLoading,setHistLoading]= useState(false);
  const [showConvert,setShowConvert]= useState(false);
  const [convertedId,setConvertedId]= useState(booking.convertedToAppointmentId || "");
  const [convSuccess,setConvSuccess]= useState("");

  // Reschedule (change preferred date/time)
  const [reschedDate,    setReschedDate]    = useState(booking.date || "");
  const [reschedTime,    setReschedTime]    = useState(booking.time || "");
  const [reschedReason,  setReschedReason]  = useState("");
  const [savingResched,  setSavingResched]  = useState(false);
  const [reschedDone,    setReschedDone]    = useState(false);

  const waNumber = (booking.phone || "").replace(/\D/g, "");
  const waHref   = waNumber ? `https://wa.me/${waNumber}?text=Hi%20${encodeURIComponent(booking.name)}%2C%20this%20is%20DR%20Youth%20Clinic%20regarding%20your%20booking.` : null;
  const telHref  = waNumber ? `tel:+${waNumber}` : null;

  const loadHistory = useCallback(async () => {
    if (!booking.phone) return;
    setHistLoading(true);
    const res  = await fetch(`/api/admin/bookings/patient-history?phone=${encodeURIComponent(booking.phone)}`);
    const data = await res.json();
    if (data.success) setHistory(data.data);
    setHistLoading(false);
  }, [booking.phone]);

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab, loadHistory]);

  async function updateStatus(s: BookingStatus) {
    if (s === status) return;
    setSavingStatus(true);
    const res  = await fetch(`/api/admin/bookings/${booking._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s, ...(s === "contacted" ? { setContactedAt: true } : {}) }),
    });
    if (res.ok) { setStatusVal(s); onUpdate({ status: s }); }
    setSavingStatus(false);
  }

  async function saveReschedule() {
    if (!reschedDate || !reschedTime) return;
    setSavingResched(true);
    const res = await fetch(`/api/admin/bookings/${booking._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: reschedDate, time: reschedTime }),
    });
    if (res.ok) {
      onUpdate({ date: reschedDate, time: reschedTime });
      setReschedDone(true);
      setTimeout(() => setReschedDone(false), 3000);
    }
    setSavingResched(false);
  }

  async function saveNote() {
    setSavingNote(true);
    await fetch(`/api/admin/bookings/${booking._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ internalNote: note, treatmentValue: value ? Number(value) : null }),
    });
    onUpdate({ internalNote: note, treatmentValue: value ? Number(value) : undefined });
    setSavingNote(false);
  }

  const src = SOURCE_META[booking.source || "website"] || SOURCE_META.other;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-40 flex flex-col bg-white shadow-2xl border-l border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-[#f6faff] to-white shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-[#0B2560] text-lg leading-tight truncate">{booking.name}</h2>
                {booking.isReturnVisit && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full shrink-0">
                    <Repeat2 size={10} /> Returning
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                <span className="font-mono">{booking.phone}</span>
                {booking.email && <span className="text-gray-400">·</span>}
                {booking.email && <span className="text-xs truncate">{booking.email}</span>}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <StatusBadge status={status} />
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${src.color}`}>
                  {src.icon} {src.label}
                </span>
                <span className="text-[11px] text-gray-400">{timeAgo(booking.createdAt)}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 shrink-0 mt-0.5">
              <X size={18} />
            </button>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 mt-3">
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold bg-[#25D366] text-white px-3 py-1.5 rounded-xl hover:brightness-105 transition">
                <MessageCircle size={13} /> WhatsApp
              </a>
            )}
            {telHref && (
              <a href={telHref}
                className="flex items-center gap-1.5 text-xs font-semibold bg-[#0B2560] text-white px-3 py-1.5 rounded-xl hover:bg-[#0d2d72] transition">
                <Phone size={13} /> Call
              </a>
            )}
            {!convertedId ? (
              <button
                onClick={() => setShowConvert(true)}
                className="flex items-center gap-1.5 text-xs font-semibold border border-[#0B2560] text-[#0B2560] px-3 py-1.5 rounded-xl hover:bg-[#f6faff] transition ml-auto">
                <Calendar size={13} /> → Appointment
              </button>
            ) : (
              <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl ml-auto">
                <CheckCircle size={12} /> Converted
              </span>
            )}
          </div>
          {convSuccess && (
            <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              ✅ Appointment created: {convSuccess}. <a href="/admin/appointments" className="underline">View Appointments →</a>
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div className="px-5 py-3 border-b border-gray-100 shrink-0">
          <PipelineBar current={status} onChange={updateStatus} saving={savingStatus} />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          {([
            { key: "details", label: "Details",  icon: <Info size={13} /> },
            { key: "notes",   label: "Notes",    icon: <StickyNote size={13} /> },
            { key: "history", label: "History",  icon: <History size={13} /> },
          ] as const).map(({ key, label, icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-colors
                ${tab === key ? "border-[#0B2560] text-[#0B2560]" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Details tab ── */}
          {tab === "details" && (
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Service",    value: booking.service  || "—" },
                  { label: "Location",   value: booking.location || "—" },
                  { label: "Booking ID", value: booking.bookingId || "—" },
                  { label: "Source",     value: src.label },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-gray-700">{value}</p>
                  </div>
                ))}
              </div>

              {/* Reschedule preferred slot */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Calendar size={11} /> Preferred Slot {booking.date ? `— currently ${booking.date} · ${booking.time}` : ""}
                </p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 mb-1 block">Date</label>
                    <input type="date" value={reschedDate} onChange={(e) => { setReschedDate(e.target.value); setReschedDone(false); }}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-[#0B2560]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 mb-1 block">Time</label>
                    <select value={reschedTime} onChange={(e) => { setReschedTime(e.target.value); setReschedDone(false); }}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-[#0B2560] bg-white">
                      <option value="">Select…</option>
                      {["09:00 AM","10:00 AM","11:00 AM","12:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM","06:00 PM"].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button onClick={saveReschedule} disabled={savingResched || !reschedDate || !reschedTime}
                  className={`w-full py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5
                    ${reschedDone ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-[#0B2560] text-white hover:bg-[#0d2d72] disabled:opacity-40"}`}>
                  {savingResched ? <Loader2 size={12} className="animate-spin" /> : reschedDone ? <><CheckCircle size={12} /> Slot updated</> : <><Calendar size={12} /> Update Preferred Slot</>}
                </button>
              </div>

              {booking.concern && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mb-1">Patient Concern</p>
                  <p className="text-sm text-blue-800 leading-relaxed">{booking.concern}</p>
                </div>
              )}

              {booking.promoCode && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <TrendingUp size={14} className="text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800">Promo: <strong>{booking.promoCode}</strong> ({booking.promoDiscount}% off)</p>
                </div>
              )}

              {/* Treatment value */}
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Estimated Treatment Value (₹)
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. 8000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0B2560]"
                />
              </div>
            </div>
          )}

          {/* ── Notes tab ── */}
          {tab === "notes" && (
            <div className="px-5 py-4">
              <label className="text-xs font-semibold text-gray-500 mb-2 block">Internal Notes</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={6}
                placeholder="Add internal notes visible only to your team…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] resize-none"
              />
              <button onClick={saveNote} disabled={savingNote}
                className="mt-3 w-full bg-[#0B2560] text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[#0d2d72] transition">
                {savingNote ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Save Note
              </button>
            </div>
          )}

          {/* ── History tab ── */}
          {tab === "history" && (
            <div className="px-5 py-4">
              {histLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-gray-300" />
                </div>
              ) : !history ? (
                <p className="text-sm text-gray-400 text-center py-8">No history found.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    {history.totalVisits} total visits for this number
                  </p>
                  {history.appointments.map((a: any) => (
                    <div key={a._id} className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                      <Calendar size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{a.service}</p>
                        <p className="text-xs text-gray-500">{a.date} · {a.startTime} · {a.doctorName}</p>
                        <StatusBadge status={a.status} />
                      </div>
                    </div>
                  ))}
                  {history.bookings.filter((b: any) => b._id !== booking._id).map((b: any) => (
                    <div key={b._id} className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
                      <Info size={14} className="text-blue-600 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{b.service || "Booking"}</p>
                        <p className="text-xs text-gray-500">{b.date} · {b.time} · {b.location}</p>
                        <StatusBadge status={b.status || "new"} />
                      </div>
                    </div>
                  ))}
                  {history.totalVisits === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">First-time patient.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showConvert && (
        <ConvertModal
          booking={booking}
          doctors={doctors}
          onClose={() => setShowConvert(false)}
          onSuccess={(id) => {
            setConvertedId(id);
            setConvSuccess(id);
            setShowConvert(false);
            onUpdate({ convertedToAppointmentId: id, status: "confirmed" });
            setStatusVal("confirmed");
          }}
        />
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BookingsClient({ userRole, assignedClinics, doctors }: Props) {
  const [bookings,    setBookings]    = useState<Booking[]>([]);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [statsLoading,setStatsLoading]= useState(true);
  const [selected,    setSelected]    = useState<Booking | null>(null);
  const [error,       setError]       = useState("");

  // Filters
  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState("");
  const [service,  setService]  = useState("");
  const [location, setLocation] = useState("");
  const [source,   setSource]   = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const canWrite = !["content_editor"].includes(userRole);
  const branchRestricted = !assignedClinics.includes("all");

  // ── Fetch data ──────────────────────────────────────────────────────────────

  const fetchBookings = useCallback(async (p = page) => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(p), limit: "20",
      ...(search   && { search }),
      ...(status   && { status }),
      ...(service  && { service }),
      ...(location && { location }),
      ...(source   && { source }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo   && { dateTo }),
    });
    const res = await fetch(`/api/admin/bookings?${params}`);
    const data = await res.json();
    if (data.success) {
      setBookings(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } else {
      setError(data.message || "Failed to load bookings");
    }
    setLoading(false);
  }, [page, search, status, service, location, source, dateFrom, dateTo]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    const res  = await fetch("/api/admin/bookings/stats");
    const data = await res.json();
    if (data.success) setStats(data.data);
    setStatsLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (search) {
      searchTimer.current = setTimeout(() => { setPage(1); fetchBookings(1); }, 400);
    } else {
      setPage(1); fetchBookings(1);
    }
    return () => clearTimeout(searchTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, service, location, source, dateFrom, dateTo]);

  useEffect(() => { fetchBookings(page); }, [page]); // eslint-disable-line

  const activeFilters = [status, service, location, source, dateFrom, dateTo].filter(Boolean).length;

  function clearFilters() {
    setSearch(""); setStatus(""); setService(""); setLocation(""); setSource(""); setDateFrom(""); setDateTo("");
  }

  function handleUpdate(id: string, patch: Partial<Booking>) {
    setBookings((prev) => prev.map((b) => b._id === id ? { ...b, ...patch } : b));
    if (selected?._id === id) setSelected((s) => s ? { ...s, ...patch } : s);
    fetchStats();
  }

  function exportCSV() {
    const BOM = "﻿";
    const header = ["Booking ID","Name","Phone","Email","Service","Location","Date","Time","Status","Source","Value","Concern","Created"].join(",");
    const rows = bookings.map((b) => [
      b.bookingId, b.name, b.phone, b.email, b.service, b.location, b.date, b.time,
      b.status, b.source, b.treatmentValue ?? "", b.concern, b.createdAt,
    ].map((v) => {
      const s = String(v ?? "");
      const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
      return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    }).join(","));
    const csv  = BOM + [header, ...rows].join("\n");
    const link = document.createElement("a");
    link.href  = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    link.download = `bookings-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  }

  return (
    <div className="min-h-screen bg-[#f6faff]">
      <div className={`transition-all duration-300 ${selected ? "mr-[400px]" : ""}`}>
        <div className="px-6 py-8 max-w-[1400px]">

          {/* ── Page header ── */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#0B2560]">Booking Leads</h1>
              <p className="text-gray-400 text-sm mt-0.5">CRM pipeline — from inquiry to treatment</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => { fetchBookings(); fetchStats(); }}
                className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 bg-white text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-50 transition">
                <RefreshCw size={13} /> Refresh
              </button>
              <button onClick={exportCSV}
                className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 bg-white text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-50 transition">
                <Download size={13} /> Export
              </button>
            </div>
          </div>

          {/* ── Stats ── */}
          <StatsBar stats={stats} loading={statsLoading} />

          {/* ── Filters ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, phone, email…"
                  className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0B2560]"
                />
              </div>

              {/* Status */}
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#0B2560] bg-white">
                <option value="">All Statuses</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_META[s].icon} {STATUS_META[s].label}</option>
                ))}
              </select>

              {/* Service */}
              <select value={service} onChange={(e) => setService(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#0B2560] bg-white">
                <option value="">All Services</option>
                {SERVICES.map((s) => <option key={s}>{s}</option>)}
              </select>

              {/* Location */}
              <select value={location} onChange={(e) => setLocation(e.target.value)}
                disabled={branchRestricted}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#0B2560] bg-white disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="">All Locations</option>
                {(branchRestricted ? assignedClinics : LOCATIONS).map((l) => <option key={l}>{l}</option>)}
              </select>

              {/* Source */}
              <select value={source} onChange={(e) => setSource(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#0B2560] bg-white">
                <option value="">All Sources</option>
                {Object.entries(SOURCE_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>

              {/* Date range */}
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                title="Date from"
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#0B2560] w-36" />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                title="Date to"
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#0B2560] w-36" />

              {activeFilters > 0 && (
                <button onClick={clearFilters}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-red-600 transition">
                  <X size={12} /> Clear ({activeFilters})
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* ── Result info ── */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">
              {loading ? "Loading…" : `${total} booking${total !== 1 ? "s" : ""}`}
              {activeFilters > 0 && <span className="ml-1 text-gray-400">(filtered)</span>}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Filter size={11} /> {activeFilters} filter{activeFilters !== 1 ? "s" : ""} active
            </div>
          </div>

          {/* ── Table ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-gray-300" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Search size={32} className="mb-3 opacity-30" />
                <p className="font-semibold">No bookings found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      {["Patient","Service","Location","Date & Time","Status","Source","Actions"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {bookings.map((b) => {
                      const src = SOURCE_META[b.source || "website"] || SOURCE_META.other;
                      const waNum = (b.phone || "").replace(/\D/g, "");
                      return (
                        <tr
                          key={b._id}
                          onClick={() => setSelected(b._id === selected?._id ? null : b)}
                          className={`cursor-pointer transition-colors hover:bg-blue-50/40 ${b._id === selected?._id ? "bg-blue-50/60" : ""}`}
                        >
                          {/* Patient */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-semibold text-sm text-gray-800 truncate max-w-[140px]">{b.name}</p>
                                  {b.isReturnVisit && (
                                    <span title="Returning patient" className="text-violet-500 shrink-0">
                                      <Repeat2 size={12} />
                                    </span>
                                  )}
                                  {b.convertedToAppointmentId && (
                                    <span title="Converted to appointment" className="text-emerald-500 shrink-0">
                                      <CheckCircle size={12} />
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 font-mono">{b.phone}</p>
                              </div>
                            </div>
                          </td>

                          {/* Service */}
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-700">{b.service || "—"}</p>
                            {b.treatmentValue ? (
                              <p className="text-xs text-violet-600 font-semibold">{fmtINR(b.treatmentValue)}</p>
                            ) : null}
                          </td>

                          {/* Location */}
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{b.location || "—"}</td>

                          {/* Date/Time */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {b.date ? (
                              <>
                                <p className="text-sm text-gray-700">{b.date}</p>
                                <p className="text-xs text-gray-400">{b.time}</p>
                              </>
                            ) : <span className="text-gray-400 text-sm">—</span>}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge status={b.status || "new"} />
                          </td>

                          {/* Source */}
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${src.color}`}>
                              {src.icon} {src.label}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              {waNum && (
                                <a
                                  href={`https://wa.me/${waNum}?text=Hi%20${encodeURIComponent(b.name)}%2C%20this%20is%20DR%20Youth%20Clinic.`}
                                  target="_blank" rel="noopener noreferrer"
                                  title="WhatsApp"
                                  className="p-1.5 rounded-lg text-[#25D366] hover:bg-green-50 transition">
                                  <MessageCircle size={15} />
                                </a>
                              )}
                              <button title="Open details" onClick={() => setSelected(b)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-[#0B2560] hover:bg-blue-50 transition">
                                <Edit2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">
                  <ChevronLeft size={14} /> Prev
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pNum = page <= 3 ? i + 1 : page + i - 2;
                    if (pNum < 1 || pNum > totalPages) return null;
                    return (
                      <button key={pNum} onClick={() => setPage(pNum)}
                        className={`w-8 h-8 rounded-xl text-sm font-semibold transition ${pNum === page ? "bg-[#0B2560] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                        {pNum}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Drawer ── */}
      {selected && (
        <BookingDrawer
          booking={selected}
          doctors={doctors}
          onClose={() => setSelected(null)}
          onUpdate={(patch) => handleUpdate(selected._id, patch)}
        />
      )}
    </div>
  );
}
