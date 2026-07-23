"use client";

import { useEffect, useState, useCallback } from "react";
import { STATUS_META, TRANSITIONS, RESCHEDULE_REASONS, getAllowedTransitions, canReschedule, STATUS_TIMELINE, APPOINTMENT_EXPORT_ROLES } from "@/app/lib/appointmentFlow";
import type { AppointmentStatus, RescheduleReason } from "@/app/models/Appointment";
import type { AdminRole } from "@/app/lib/permissions";

// ─── Types ────────────────────────────────────────────────────────────────────

// Fallback list shown before Settings loads (and if an admin hasn't
// customized it yet) — Settings.booking.sources is the actual source of
// truth, fetched by NewAppointmentModal.
const DEFAULT_BOOKING_SOURCES = ["Website", "Instagram", "Facebook", "Google", "WhatsApp", "Referral", "Walk-in", "Phone", "Just Dial", "Other"];

// bookingSource is a free-text field (admin-configurable list, not a fixed
// enum) — this formats both new Title-Case values ("Just Dial") and legacy
// snake_case ones ("walk_in") into consistent display text without needing
// an exhaustive lookup map.
function formatSourceLabel(value?: string): string {
  if (!value?.trim()) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type Doctor = { _id: string; name: string; locations: string[]; specializations: string[] };

type Appointment = {
  _id: string;
  appointmentId?: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  branch: string;
  doctorId: string;
  doctorName: string;
  service: string;
  appointmentType: string;
  durationMinutes: number;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  skinConcern?: string;
  sessionNumber?: number;
  totalSessions?: number;
  bookingSource?: string;
  patchTestRequired?: boolean;
  patchTestDone?: boolean;
  consentFormSigned?: boolean;
  rescheduleCount?: number;
  internalNotes?: string;
  cancellationReason?: string;
  createdAt?: string;
  notificationsSent?: { type: string; channel: string; sentAt: string }[];
};

type AuditEntry = {
  _id: string;
  action: string;
  performedBy: { name: string; role: string };
  details: Record<string, any>;
  performedAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) => {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
};
const fmtTime = (t: string) => {
  if (!t) return "—";
  const [h, min] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(min).padStart(2, "0")} ${ampm}`;
};
const fmtDateTime = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${m.color} ${m.textColor}`}>
      {m.icon} {m.label}
    </span>
  );
}

// ─── Status Timeline (horizontal) ────────────────────────────────────────────

function StatusTimeline({ current }: { current: AppointmentStatus }) {
  const terminal = ["cancelled", "no_show"].includes(current);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {STATUS_TIMELINE.map((s, i) => {
        const idx     = STATUS_TIMELINE.indexOf(current);
        const isPast  = i < idx;
        const isCurr  = s === current;
        const m       = STATUS_META[s];
        return (
          <div key={s} className="flex items-center shrink-0">
            <div className={`flex flex-col items-center`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 ${
                isCurr && !terminal ? "border-blue-600 bg-blue-600 text-white" :
                isPast             ? "border-green-500 bg-green-500 text-white" :
                                     "border-gray-200 bg-white text-gray-400"
              }`}>
                {isPast ? "✓" : m.icon}
              </div>
              <p className={`text-[9px] mt-0.5 whitespace-nowrap ${isCurr ? "font-bold text-blue-700" : isPast ? "text-green-600" : "text-gray-400"}`}>
                {m.label.split(" ").slice(0, 2).join(" ")}
              </p>
            </div>
            {i < STATUS_TIMELINE.length - 1 && (
              <div className={`w-5 h-0.5 shrink-0 mx-0.5 ${isPast ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
      {terminal && (
        <>
          <div className="w-5 h-0.5 bg-gray-200 mx-0.5" />
          <div className="flex flex-col items-center shrink-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 border-current ${STATUS_META[current].textColor} bg-white`}>
              {STATUS_META[current].icon}
            </div>
            <p className={`text-[9px] mt-0.5 font-bold ${STATUS_META[current].textColor}`}>{STATUS_META[current].label}</p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Appointment Detail Modal ──────────────────────────────────────────────────

function AppointmentModal({
  appt,
  role,
  onClose,
  onStatusChange,
  onReschedule,
}: {
  appt: Appointment;
  role: AdminRole;
  onClose: () => void;
  onStatusChange: (id: string, newStatus: AppointmentStatus) => void;
  onReschedule: (id: string) => void;
}) {
  const [auditLog, setAuditLog]   = useState<AuditEntry[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [transitioning, setTransitioning] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [tab, setTab]             = useState<"details" | "timeline" | "notify">("details");

  useEffect(() => {
    fetch(`/api/admin/appointments/${appt._id}`)
      .then((r) => r.json())
      .then((d) => { if (d.auditLog) setAuditLog(d.auditLog); });

    fetch(`/api/admin/notifications?appointmentId=${appt._id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setNotifications(d.data || []); })
      .catch(() => {});
  }, [appt._id]);

  const transitions = getAllowedTransitions(appt.status, role);
  const canResched  = canReschedule(role, appt.status);

  const doTransition = async (to: AppointmentStatus) => {
    setTransitioning(true);
    try {
      const res  = await fetch(`/api/admin/appointments/${appt._id}/status`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ toStatus: to, note: statusNote }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      onStatusChange(appt._id, to);
      onClose();
    } catch (err: any) {
      alert(err.message || "Status update failed");
    } finally {
      setTransitioning(false);
    }
  };

  const TYPE_LABELS: Record<string, string> = {
    consultation: "Consultation", treatment: "Treatment",
    follow_up: "Follow-up", patch_test: "Patch Test",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-[#0B2545] px-6 py-4 flex items-start justify-between shrink-0">
          <div>
            <p className="text-blue-300 text-xs font-mono">{appt.appointmentId || appt._id.slice(-8).toUpperCase()}</p>
            <h2 className="text-white font-bold text-lg">{appt.patientName}</h2>
            <p className="text-blue-200 text-sm">{appt.service} · {fmtDate(appt.date)} {fmtTime(appt.startTime)} · {appt.branch}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={appt.status} />
            <button onClick={onClose} className="text-blue-300 hover:text-white text-sm transition">✕ Close</button>
          </div>
        </div>

        {/* Status timeline */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 shrink-0 overflow-x-auto">
          <StatusTimeline current={appt.status} />
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-100 shrink-0">
          {(["details", "timeline", "notify"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium capitalize transition border-b-2 ${
                tab === t ? "border-[#0B2545] text-[#0B2545]" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t === "details" ? "📋 Details" : t === "timeline" ? "📜 Audit" : "📲 Notify"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* Details tab */}
          {tab === "details" && (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Phone"    value={appt.patientPhone} />
                <Field label="Email"    value={appt.patientEmail || "—"} />
                <Field label="Doctor"   value={appt.doctorName} />
                <Field label="Branch"   value={appt.branch} />
                <Field label="Type"     value={TYPE_LABELS[appt.appointmentType] || appt.appointmentType} />
                <Field label="Source"   value={formatSourceLabel(appt.bookingSource)} />
                <Field label="Duration" value={`${appt.durationMinutes} min (${fmtTime(appt.startTime)} – ${fmtTime(appt.endTime)})`} />
                {appt.skinConcern && <Field label="Concern"  value={appt.skinConcern} />}
                {appt.sessionNumber && <Field label="Session" value={`${appt.sessionNumber} of ${appt.totalSessions || "?"}`} />}
                {(appt.rescheduleCount ?? 0) > 0 && <Field label="Rescheduled" value={`${appt.rescheduleCount}×`} />}
              </div>

              {/* Pre-treatment checklist */}
              <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pre-Treatment Checklist</p>
                <Checkbox label="Patch Test Required" checked={appt.patchTestRequired} />
                <Checkbox label="Patch Test Done"     checked={appt.patchTestDone} />
                <Checkbox label="Consent Form Signed" checked={appt.consentFormSigned} />
              </div>

              {appt.internalNotes && (
                <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4">
                  <p className="text-xs font-semibold text-yellow-700 mb-1">Notes</p>
                  <p className="text-sm text-yellow-900 whitespace-pre-wrap">{appt.internalNotes}</p>
                </div>
              )}

              {/* Action buttons */}
              {(transitions.length > 0 || canResched) && (
                <div className="space-y-3 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500">Optional note for this action</label>
                    <input
                      type="text"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="Add a note (optional)"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {transitions.map((t) => (
                      <button
                        key={t.to}
                        onClick={() => doTransition(t.to)}
                        disabled={transitioning}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${
                          t.to === "cancelled" || t.to === "no_show"
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-[#0B2545] text-white hover:bg-[#1a3a6e]"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                    {canResched && (
                      <button
                        onClick={() => { onClose(); onReschedule(appt._id); }}
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
                      >
                        🗓️ Reschedule
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Audit log tab */}
          {tab === "timeline" && (
            <div className="p-6 space-y-3">
              {auditLog.length === 0 && <p className="text-sm text-gray-400">No audit entries yet.</p>}
              {auditLog.map((e) => (
                <div key={e._id} className="flex gap-3 text-sm">
                  <div className="shrink-0 w-2 h-2 mt-1.5 rounded-full bg-blue-400" />
                  <div>
                    <p className="font-medium text-gray-800">
                      {e.action === "status_changed" && `${e.details.oldStatus} → ${e.details.newStatus}`}
                      {e.action === "rescheduled"    && `Rescheduled: ${e.details.oldDate} ${e.details.oldStartTime} → ${e.details.newDate} ${e.details.newStartTime}`}
                      {e.action === "created"        && "Appointment created"}
                      {e.action === "note_added"     && "Notes updated"}
                    </p>
                    {e.action === "rescheduled" && (
                      <p className="text-gray-500 text-xs">Reason: {e.details.reason} {e.details.reasonDetail ? `— ${e.details.reasonDetail}` : ""}</p>
                    )}
                    {e.details.note && <p className="text-gray-500 text-xs italic">"{e.details.note}"</p>}
                    <p className="text-gray-400 text-xs">{e.performedBy.name} ({e.performedBy.role}) · {fmtDateTime(e.performedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notifications tab */}
          {tab === "notify" && (
            <NotificationsTab appointmentId={appt._id} patientName={appt.patientName} />
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-gray-800 font-medium">{value}</p>
    </div>
  );
}
function Checkbox({ label, checked }: { label: string; checked?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={checked ? "text-green-600" : "text-gray-300"}>{checked ? "☑" : "☐"}</span>
      <span className={checked ? "text-gray-800" : "text-gray-400"}>{label}</span>
    </div>
  );
}

// ─── Notifications tab ─────────────────────────────────────────────────────────

function NotificationsTab({ appointmentId, patientName }: { appointmentId: string; patientName: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/notifications?appointmentId=${appointmentId}`)
      .then((r) => r.json())
      .then((d) => { setItems(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [appointmentId]);

  const markSent = async (id: string) => {
    await fetch(`/api/admin/notifications/${id}/confirm`, { method: "POST" });
    setItems((prev) => prev.map((n) => n._id === id ? { ...n, manuallyConfirmed: true } : n));
  };

  if (loading) return <p className="p-6 text-sm text-gray-400">Loading…</p>;
  if (items.length === 0) return <p className="p-6 text-sm text-gray-400">No notifications queued.</p>;

  return (
    <div className="p-6 space-y-4">
      {items.map((n) => (
        <div key={n._id} className="rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">{n.trigger.replace(/_/g, " ")} · {n.channel}</span>
            {n.manuallyConfirmed
              ? <span className="text-xs text-green-600 font-semibold">✓ Sent</span>
              : <span className="text-xs text-amber-600 font-semibold">⏳ Pending</span>}
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{n.message}</p>
          {!n.manuallyConfirmed && n.whatsappUrl && (
            <div className="flex gap-2">
              <a
                href={n.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-green-600 text-white text-center text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition"
              >
                📲 Open WhatsApp
              </a>
              <button
                onClick={() => markSent(n._id)}
                className="px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                Mark Sent
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Reschedule Modal ──────────────────────────────────────────────────────────

function RescheduleModal({
  apptId,
  onClose,
  onSuccess,
}: {
  apptId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({ newDate: "", newStartTime: "", reason: "" as RescheduleReason | "", reasonDetail: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [conflict, setConflict] = useState("");

  const submit = async () => {
    if (!form.newDate || !form.newStartTime || !form.reason) {
      setError("Date, time, and reason are all required.");
      return;
    }
    setSaving(true);
    setError("");
    setConflict("");
    try {
      const res  = await fetch(`/api/admin/appointments/${apptId}/reschedule`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        if (data.conflict) { setConflict(data.message); setSaving(false); return; }
        throw new Error(data.message);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Reschedule failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-amber-600 px-6 py-4">
          <h2 className="text-white font-bold text-lg">🗓️ Reschedule Appointment</h2>
          <p className="text-amber-100 text-xs">Audit log entry will be created automatically</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          {conflict && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 font-medium">
              ⚠️ Conflict: {conflict}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">New Date</label>
              <input type="date" value={form.newDate} onChange={(e) => setForm({ ...form, newDate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">New Start Time</label>
              <input type="time" value={form.newStartTime} onChange={(e) => setForm({ ...form, newStartTime: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500">Reason *</label>
            <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value as RescheduleReason })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="">Select reason…</option>
              {Object.entries(RESCHEDULE_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500">Additional detail (optional)</label>
            <input type="text" value={form.reasonDetail} onChange={(e) => setForm({ ...form, reasonDetail: e.target.value })}
              placeholder="e.g. Patient called at 9 AM"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} disabled={saving} className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition">Cancel</button>
            <button onClick={submit} disabled={saving} className="flex-1 bg-amber-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition">
              {saving ? "Saving…" : "Confirm Reschedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── New Appointment Modal ─────────────────────────────────────────────────────

function NewAppointmentModal({
  doctors,
  assignedClinics,
  onClose,
  onSuccess,
}: {
  doctors: Doctor[];
  assignedClinics: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    patientName: "", patientPhone: "", patientEmail: "",
    branch: assignedClinics.includes("all") ? "" : assignedClinics[0] || "",
    doctorId: "", doctorName: "",
    service: "", appointmentType: "consultation", durationMinutes: "30",
    date: "", startTime: "",
    skinConcern: "", bookingSource: "Phone",
    patchTestRequired: false, consentFormSigned: false,
    sessionNumber: "", totalSessions: "", packageName: "",
    internalNotes: "",
  });
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [conflict,  setConflict]  = useState("");
  const [checking,  setChecking]  = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [sourceOptions, setSourceOptions] = useState<string[]>(DEFAULT_BOOKING_SOURCES);

  useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json()).then((d) => {
      const sources = d?.data?.booking?.sources;
      if (Array.isArray(sources) && sources.length > 0) setSourceOptions(sources);
    }).catch(() => {});
  }, []);

  const setF = (k: string, v: any) => { setForm((f) => ({ ...f, [k]: v })); setAvailable(null); setConflict(""); };

  // Availability check after time/doctor/date change
  useEffect(() => {
    const { doctorId, date, startTime, durationMinutes } = form;
    if (!doctorId || !date || !startTime) return;
    const t = setTimeout(async () => {
      setChecking(true);
      try {
        const res  = await fetch(`/api/admin/appointments/check-availability?doctorId=${doctorId}&date=${date}&startTime=${startTime}&durationMinutes=${durationMinutes}`);
        const data = await res.json();
        setAvailable(data.available);
        if (!data.available) setConflict(data.conflict?.reason || "Time slot not available");
      } catch { setAvailable(null); }
      finally { setChecking(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [form.doctorId, form.date, form.startTime, form.durationMinutes]);

  const submit = async () => {
    if (available === false) { setError("Please select an available time slot."); return; }
    setSaving(true); setError("");
    try {
      const res  = await fetch("/api/admin/appointments", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          ...form,
          durationMinutes: Number(form.durationMinutes),
          sessionNumber:   form.sessionNumber ? Number(form.sessionNumber) : undefined,
          totalSessions:   form.totalSessions ? Number(form.totalSessions) : undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        if (data.conflict) { setConflict(data.message); setSaving(false); return; }
        throw new Error(data.message);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create appointment");
    } finally { setSaving(false); }
  };

  const branchDoctors = form.branch
    ? doctors.filter((d) => d.locations.includes("all") || d.locations.includes(form.branch.toLowerCase()))
    : doctors;

  const TYPE_DURATIONS: Record<string, number> = { consultation: 30, treatment: 60, follow_up: 20, patch_test: 15 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-[#0B2545] px-6 py-4 sticky top-0 z-10">
          <h2 className="text-white font-bold text-lg">➕ New Appointment</h2>
          <p className="text-blue-200 text-xs">Conflict check runs automatically after you select doctor + date + time</p>
        </div>
        <div className="p-6 space-y-5">

          {conflict && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 font-medium flex gap-2">
              <span>⚠️</span><span>{conflict}</span>
            </div>
          )}
          {available === true && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700 font-medium flex gap-2">
              <span>✅</span><span>Time slot is available</span>
            </div>
          )}
          {checking && <p className="text-xs text-gray-400">Checking availability…</p>}

          {/* Patient */}
          <Section title="Patient Information">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Name *"  value={form.patientName}  onChange={(v) => setF("patientName", v)} />
              <Input label="Phone *" value={form.patientPhone} onChange={(v) => setF("patientPhone", v)} type="tel" />
              <Input label="Email"   value={form.patientEmail} onChange={(v) => setF("patientEmail", v)} type="email" />
              <Select label="Source" value={form.bookingSource} onChange={(v) => setF("bookingSource", v)}
                options={sourceOptions.map((s) => [s, s] as [string, string])} />
            </div>
          </Section>

          {/* Clinic */}
          <Section title="Clinic & Doctor">
            <div className="grid grid-cols-2 gap-3">
              {assignedClinics.includes("all") ? (
                <Input label="Branch *" value={form.branch} onChange={(v) => setF("branch", v)} placeholder="e.g. Anna Nagar" />
              ) : (
                <Select label="Branch *" value={form.branch} onChange={(v) => setF("branch", v)}
                  options={assignedClinics.map((c) => [c, c] as [string, string])} />
              )}
              <Select label="Doctor *" value={form.doctorId} onChange={(v) => {
                const doc = doctors.find((d) => d._id === v);
                setF("doctorId", v);
                setF("doctorName", doc?.name || "");
              }}
                options={[["", "Select doctor…"] as [string,string], ...branchDoctors.map((d) => [d._id, d.name] as [string,string])]} />
            </div>
          </Section>

          {/* Treatment */}
          <Section title="Treatment">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Service / Treatment *" value={form.service} onChange={(v) => setF("service", v)} placeholder="e.g. Laser Hair Removal" />
              <Select label="Type" value={form.appointmentType} onChange={(v) => { setF("appointmentType", v); setF("durationMinutes", String(TYPE_DURATIONS[v] || 30)); }}
                options={[["consultation","Consultation"],["treatment","Treatment"],["follow_up","Follow-up"],["patch_test","Patch Test"]]} />
              <Input label="Skin Concern" value={form.skinConcern} onChange={(v) => setF("skinConcern", v)} placeholder="e.g. Acne, Pigmentation" />
              <Select label="Duration (min)" value={form.durationMinutes} onChange={(v) => setF("durationMinutes", v)}
                options={[["15","15 min"],["20","20 min"],["30","30 min"],["45","45 min"],["60","60 min"],["90","90 min"],["120","2 hours"]]} />
            </div>
          </Section>

          {/* Date & Time */}
          <Section title="Date & Time">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Date *"       type="date" value={form.date}      onChange={(v) => setF("date", v)} />
              <Input label="Start Time *" type="time" value={form.startTime} onChange={(v) => setF("startTime", v)} />
            </div>
          </Section>

          {/* Package tracking */}
          <Section title="Package / Session (optional)">
            <div className="grid grid-cols-3 gap-3">
              <Input label="Package Name"  value={form.packageName}  onChange={(v) => setF("packageName", v)} placeholder="e.g. Laser Package" />
              <Input label="Session #"     value={form.sessionNumber} onChange={(v) => setF("sessionNumber", v)} type="number" placeholder="1" />
              <Input label="Total Sessions" value={form.totalSessions} onChange={(v) => setF("totalSessions", v)} type="number" placeholder="6" />
            </div>
          </Section>

          {/* Pre-treatment */}
          <Section title="Pre-Treatment">
            <div className="flex gap-6">
              <CheckboxInput label="Patch Test Required" checked={form.patchTestRequired} onChange={(v) => setF("patchTestRequired", v)} />
              <CheckboxInput label="Consent Form Signed"  checked={form.consentFormSigned}  onChange={(v) => setF("consentFormSigned", v)} />
            </div>
          </Section>

          {/* Notes */}
          <Section title="Internal Notes">
            <textarea value={form.internalNotes} onChange={(e) => setF("internalNotes", e.target.value)}
              rows={2} placeholder="Visible to staff only…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </Section>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} disabled={saving} className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition">Cancel</button>
            <button onClick={submit} disabled={saving || available === false} className="flex-1 bg-[#0B2545] text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-[#1a3a6e] disabled:opacity-40 transition">
              {saving ? "Creating…" : "Create Appointment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  );
}
function Input({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-500">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-500">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
function CheckboxInput({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded" />
      {label}
    </label>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function AppointmentsClient({
  userRole,
  assignedClinics,
  linkedDoctorId,
  doctors,
}: {
  userRole: AdminRole;
  assignedClinics: string[];
  linkedDoctorId: string | null;
  doctors: Doctor[];
}) {
  const canCreate = !["doctor", "content_editor", "finance_manager"].includes(userRole);
  const canExport = APPOINTMENT_EXPORT_ROLES.includes(userRole);

  const [appointments,  setAppointments]  = useState<Appointment[]>([]);
  const [total,         setTotal]         = useState(0);
  const [totalPages,    setTotalPages]    = useState(1);
  const [page,          setPage]          = useState(1);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [activeTab,     setActiveTab]     = useState<"all" | "today">("today");
  const [selectedAppt,  setSelectedAppt]  = useState<Appointment | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [showNew,       setShowNew]       = useState(false);
  const [statusFilter,  setStatusFilter]  = useState("");
  const [doctorFilter,  setDoctorFilter]  = useState("");
  const [dateFilter,    setDateFilter]    = useState("");
  const [search,        setSearch]        = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (activeTab === "today") params.set("todayOnly", "true");
      else {
        if (statusFilter) params.set("status", statusFilter);
        if (doctorFilter) params.set("doctorId", doctorFilter);
        if (dateFilter)   params.set("date", dateFilter);
        if (search)       params.set("search", search);
      }
      const res  = await fetch(`/api/admin/appointments?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to load");
      setAppointments(data.data ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, statusFilter, doctorFilter, dateFilter, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [activeTab, statusFilter, doctorFilter, dateFilter, search]);

  const handleStatusChange = (id: string, newStatus: AppointmentStatus) => {
    setAppointments((prev) => prev.map((a) => a._id === id ? { ...a, status: newStatus } : a));
  };

  const STATUS_OPTIONS = Object.entries(STATUS_META).map(([k, v]) => [k, v.label] as [string, string]);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          {userRole === "doctor" && linkedDoctorId && (
            <p className="text-sm text-blue-600 mt-0.5">👨‍⚕️ Showing your appointments only</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Tab switcher */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm font-medium">
            <button onClick={() => setActiveTab("today")}
              className={`px-4 py-2 transition ${activeTab === "today" ? "bg-[#0B2545] text-white" : "hover:bg-gray-50 text-gray-600"}`}>
              📅 Today
            </button>
            <button onClick={() => setActiveTab("all")}
              className={`px-4 py-2 transition border-l border-gray-200 ${activeTab === "all" ? "bg-[#0B2545] text-white" : "hover:bg-gray-50 text-gray-600"}`}>
              📋 All
            </button>
          </div>
          {canCreate && (
            <button onClick={() => setShowNew(true)}
              className="bg-[#0B2545] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1a3a6e] transition flex items-center gap-2">
              ➕ New Appointment
            </button>
          )}
        </div>
      </div>

      {/* Filters (All tab only) */}
      {activeTab === "all" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {userRole !== "doctor" && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Doctor</label>
                <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All Doctors</option>
                  {doctors.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">Date</label>
              <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">Search</label>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or phone"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
      )}

      {/* Summary line */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{loading ? "Loading…" : `${total.toLocaleString()} appointment${total !== 1 ? "s" : ""}${activeTab === "today" ? " today" : ""}`}</span>
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Table */}
      {!loading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {appointments.length === 0 ? (
            <div className="px-6 py-16 text-center text-gray-400">
              <p className="text-4xl mb-3">{activeTab === "today" ? "🗓️" : "🔍"}</p>
              <p className="font-medium">{activeTab === "today" ? "No appointments scheduled for today" : "No appointments match the filters"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Doctor</th>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {appointments.map((appt) => {
                    const transitions = getAllowedTransitions(appt.status, userRole);
                    const nextT       = transitions[0];
                    const canResched  = canReschedule(userRole, appt.status);
                    return (
                      <tr key={appt._id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => setSelectedAppt(appt)}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{appt.patientName}</p>
                          <p className="text-xs text-gray-500">{appt.patientPhone}</p>
                          {appt.sessionNumber && (
                            <p className="text-xs text-blue-500">Session {appt.sessionNumber}/{appt.totalSessions ?? "?"}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          <p>{appt.service}</p>
                          <p className="text-xs text-gray-400 capitalize">{appt.appointmentType.replace(/_/g, " ")}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{appt.doctorName}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                          <p>{fmtDate(appt.date)}</p>
                          <p className="text-xs">{fmtTime(appt.startTime)} – {fmtTime(appt.endTime)}</p>
                          <p className="text-xs text-gray-400">{appt.durationMinutes} min</p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={appt.status} />
                          {(appt.rescheduleCount ?? 0) > 0 && (
                            <p className="text-[10px] text-amber-600 mt-0.5">↻ Rescheduled {appt.rescheduleCount}×</p>
                          )}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1.5 flex-wrap">
                            {nextT && (
                              <button
                                onClick={async () => {
                                  const res  = await fetch(`/api/admin/appointments/${appt._id}/status`, {
                                    method:  "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body:    JSON.stringify({ toStatus: nextT.to }),
                                  });
                                  const data = await res.json();
                                  if (data.success) handleStatusChange(appt._id, nextT.to as AppointmentStatus);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                                  nextT.to === "cancelled" || nextT.to === "no_show"
                                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                }`}
                              >
                                {nextT.label}
                              </button>
                            )}
                            {canResched && (
                              <button
                                onClick={() => setReschedulingId(appt._id)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
                              >
                                ↻
                              </button>
                            )}
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded text-sm ${page === i + 1 ? "bg-[#0B2545] text-white" : "bg-gray-200 hover:bg-gray-300"}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Modals */}
      {selectedAppt && (
        <AppointmentModal
          appt={selectedAppt}
          role={userRole}
          onClose={() => setSelectedAppt(null)}
          onStatusChange={handleStatusChange}
          onReschedule={(id) => setReschedulingId(id)}
        />
      )}
      {reschedulingId && (
        <RescheduleModal
          apptId={reschedulingId}
          onClose={() => setReschedulingId(null)}
          onSuccess={() => { setReschedulingId(null); load(); }}
        />
      )}
      {showNew && (
        <NewAppointmentModal
          doctors={doctors}
          assignedClinics={assignedClinics}
          onClose={() => setShowNew(false)}
          onSuccess={() => { setShowNew(false); load(); }}
        />
      )}
    </div>
  );
}
