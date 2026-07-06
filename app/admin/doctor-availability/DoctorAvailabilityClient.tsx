"use client";

import { useEffect, useState, useCallback } from "react";
import type { AdminRole } from "@/app/lib/permissions";
import { SLOT_BLOCK_ROLES } from "@/app/lib/appointmentFlow";

type Doctor = { _id: string; name: string; locations: string[] };

type SlotBlock = {
  _id: string;
  doctorId: string;
  doctorName: string;
  branch: string;
  date: string;
  startTime: string;
  endTime: string;
  blockType: string;
  reason: string;
  createdAt: string;
};

const BLOCK_TYPE_LABELS: Record<string, string> = {
  vacation: "🏖️ Vacation",
  lunch_break: "🍱 Lunch Break",
  surgery: "🔬 Surgery / Procedure",
  training: "📚 Training",
  personal: "🔒 Personal",
  other: "📌 Other",
};

const BLOCK_TYPE_COLORS: Record<string, string> = {
  vacation:    "bg-blue-100 text-blue-700",
  lunch_break: "bg-green-100 text-green-700",
  surgery:     "bg-red-100 text-red-700",
  training:    "bg-purple-100 text-purple-700",
  personal:    "bg-gray-100 text-gray-700",
  other:       "bg-amber-100 text-amber-700",
};

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

export default function DoctorAvailabilityClient({
  userRole,
  linkedDoctorId,
  doctors,
}: {
  userRole: AdminRole;
  linkedDoctorId: string | null;
  doctors: Doctor[];
}) {
  const canBlock = SLOT_BLOCK_ROLES.includes(userRole);

  // Doctors are locked to their own profile
  const defaultDoctorId = userRole === "doctor" ? (linkedDoctorId || "") : "";

  const [blocks,      setBlocks]      = useState<SlotBlock[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [doctorFilter, setDoctorFilter] = useState(defaultDoctorId);
  const [dateFrom,    setDateFrom]    = useState("");
  const [dateTo,      setDateTo]      = useState("");
  const [showForm,    setShowForm]    = useState(false);

  const [form, setForm] = useState({
    doctorId:   defaultDoctorId,
    doctorName: doctors.find((d) => d._id === defaultDoctorId)?.name || "",
    branch:     "",
    date:       "",
    startTime:  "",
    endTime:    "",
    blockType:  "other",
    reason:     "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (doctorFilter) params.set("doctorId", doctorFilter);
      if (dateFrom)     params.set("dateFrom", dateFrom);
      if (dateTo)       params.set("dateTo", dateTo);
      if (!dateFrom && !dateTo) {
        // Default: next 30 days
        const now   = new Date();
        const later = new Date(now.getTime() + 30 * 86400_000);
        params.set("dateFrom", now.toISOString().slice(0, 10));
        params.set("dateTo",   later.toISOString().slice(0, 10));
      }
      const res  = await fetch(`/api/admin/doctor-slots?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to load");
      setBlocks(data.data ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [doctorFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.doctorId || !form.date || !form.startTime || !form.endTime) {
      setFormError("Doctor, date, start time, and end time are required.");
      return;
    }
    if (form.startTime >= form.endTime) {
      setFormError("Start time must be before end time.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const res  = await fetch("/api/admin/doctor-slots", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setShowForm(false);
      setForm((f) => ({ ...f, date: "", startTime: "", endTime: "", reason: "", blockType: "other" }));
      load();
    } catch (err: any) {
      setFormError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteBlock = async (id: string) => {
    if (!confirm("Remove this slot block?")) return;
    await fetch(`/api/admin/doctor-slots/${id}`, { method: "DELETE" });
    setBlocks((prev) => prev.filter((b) => b._id !== id));
  };

  // Group blocks by date
  const grouped = blocks.reduce((acc, b) => {
    (acc[b.date] = acc[b.date] || []).push(b);
    return acc;
  }, {} as Record<string, SlotBlock[]>);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor Availability</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage blocked slots — unavailability, lunch breaks, surgeries</p>
        </div>
        {canBlock && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-[#0B2545] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1a3a6e] transition flex items-center gap-2"
          >
            🚫 Block Slot
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
            <label className="text-xs font-semibold text-gray-500">From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500">To Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Blocks grouped by date */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-16 text-center text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-medium">No blocked slots in this period</p>
          {canBlock && <p className="text-sm mt-1">Click "Block Slot" to add unavailability</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, dayBlocks]) => (
            <div key={date} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">{fmtDate(date)}</p>
              </div>
              <div className="divide-y divide-gray-50">
                {dayBlocks.map((b) => (
                  <div key={b._id} className="flex items-center justify-between px-4 py-3 gap-4">
                    <div className="flex items-center gap-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${BLOCK_TYPE_COLORS[b.blockType] || "bg-gray-100 text-gray-600"}`}>
                        {BLOCK_TYPE_LABELS[b.blockType] || b.blockType}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{b.doctorName}</p>
                        <p className="text-xs text-gray-500">{fmtTime(b.startTime)} – {fmtTime(b.endTime)}{b.branch ? ` · ${b.branch}` : ""}</p>
                        {b.reason && <p className="text-xs text-gray-400 italic">{b.reason}</p>}
                      </div>
                    </div>
                    {canBlock && (
                      <button
                        onClick={() => deleteBlock(b._id)}
                        className="text-xs text-red-500 hover:text-red-700 transition font-medium shrink-0"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Block Slot Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#0B2545] px-6 py-4">
              <h2 className="text-white font-bold text-lg">🚫 Block Slot</h2>
              <p className="text-blue-200 text-xs">No appointments can be booked in a blocked slot</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Doctor select (hidden for doctor role) */}
              {userRole !== "doctor" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Doctor *</label>
                  <select value={form.doctorId} onChange={(e) => {
                    const doc = doctors.find((d) => d._id === e.target.value);
                    setF("doctorId", e.target.value);
                    setF("doctorName", doc?.name || "");
                  }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select doctor…</option>
                    {doctors.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Block Type *</label>
                <select value={form.blockType} onChange={(e) => setF("blockType", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {Object.entries(BLOCK_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Date *</label>
                  <input type="date" value={form.date} onChange={(e) => setF("date", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Branch</label>
                  <input type="text" value={form.branch} onChange={(e) => setF("branch", e.target.value)}
                    placeholder="e.g. Anna Nagar"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Start Time *</label>
                  <input type="time" value={form.startTime} onChange={(e) => setF("startTime", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">End Time *</label>
                  <input type="time" value={form.endTime} onChange={(e) => setF("endTime", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Reason (optional)</label>
                <input type="text" value={form.reason} onChange={(e) => setF("reason", e.target.value)}
                  placeholder="e.g. Annual leave, Equipment servicing"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} disabled={saving}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition">
                  Cancel
                </button>
                <button onClick={submit} disabled={saving}
                  className="flex-1 bg-[#0B2545] text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-[#1a3a6e] disabled:opacity-50 transition">
                  {saving ? "Saving…" : "Block Slot"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
