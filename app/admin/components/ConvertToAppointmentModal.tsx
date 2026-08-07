"use client";

import { useState } from "react";
import { X, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

interface ConvertBooking {
  _id: string;
  name?: string;
  service?: string;
  location?: string;
}

interface Doctor {
  _id: string;
  name: string;
  locations: string[];
}

export default function ConvertToAppointmentModal({
  booking, doctors, onClose, onSuccess,
}: {
  booking: ConvertBooking;
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
