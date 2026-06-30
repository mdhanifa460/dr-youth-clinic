'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, X, Loader, CheckCircle, Trash2, Edit2, Eye, EyeOff,
  Stethoscope, MapPin, Award,
} from 'lucide-react';
import ImageUpload from '@/app/admin/components/ImageUpload';

const CITIES = ['all', 'chennai', 'bangalore', 'coimbatore', 'kochi'];
const CITY_LABELS: Record<string, string> = {
  all: 'All Locations', chennai: 'Chennai', bangalore: 'Bangalore',
  coimbatore: 'Coimbatore', kochi: 'Kochi',
};

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-20 col-span-full">
      <p className="text-5xl mb-4">🩺</p>
      <p className="text-gray-500 font-semibold mb-1">No doctors added yet</p>
      <p className="text-gray-400 text-sm mb-6">
        Add your specialists to display them on the homepage and service pages.
      </p>
      <button onClick={onAdd} className="bg-[#0B2560] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0d2d73] transition">
        + Add Doctor
      </button>
    </div>
  );
}

// ── Doctor card ───────────────────────────────────────────────────────────────
function DoctorCard({
  doctor,
  onToggle,
  onDelete,
  onEdit,
}: {
  doctor: any;
  onToggle: (id: string, val: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (doctor: any) => void;
}) {
  const initials = doctor.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-3 shadow-sm transition ${
      !doctor.active ? 'opacity-60 border-dashed border-gray-300' : 'border-gray-100'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {doctor.photo?.url ? (
            <img src={doctor.photo.url} alt={doctor.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-[#0B2560]/10 flex items-center justify-center shrink-0">
              <span className="text-[#0B2560] text-sm font-bold">{initials}</span>
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-[#0B2560] leading-snug">{doctor.name}</p>
            <p className="text-xs text-[#3B82C4]">{doctor.title}</p>
          </div>
        </div>
        <button onClick={() => onDelete(doctor._id)} className="text-gray-300 hover:text-red-500 transition shrink-0">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 flex-wrap text-[10px] text-gray-400">
        <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
          <MapPin size={9} /> {doctor.location}
        </span>
        {doctor.experience > 0 && (
          <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
            <Award size={9} /> {doctor.experience}+ yrs
          </span>
        )}
        <span className="bg-gray-100 px-2 py-0.5 rounded-full">Order {doctor.order ?? 0}</span>
      </div>

      {/* Specializations */}
      {doctor.specializations?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {doctor.specializations.slice(0, 3).map((s: string, i: number) => (
            <span key={i} className="text-[10px] bg-[#f6faff] border border-blue-50 text-[#0B2560] px-2 py-0.5 rounded-full">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Bio */}
      {doctor.bio && (
        <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{doctor.bio}</p>
      )}

      {/* Controls */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-gray-50">
        <button
          onClick={() => onToggle(doctor._id, !doctor.active)}
          className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full transition ${
            doctor.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {doctor.active ? <Eye size={11} /> : <EyeOff size={11} />}
          {doctor.active ? 'Active' : 'Hidden'}
        </button>
        <button
          onClick={() => onEdit(doctor)}
          className="ml-auto flex items-center gap-1 text-[10px] text-[#3B82C4] hover:text-[#0B2560] font-semibold transition"
        >
          <Edit2 size={10} /> Edit
        </button>
      </div>
    </div>
  );
}

// ── Add / Edit modal ──────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '', title: '', photo: { url: '', publicId: '' }, specializations: '',
  bio: '', experience: 0, location: 'all', order: 0, active: true,
};

function DoctorModal({
  initial,
  onClose,
  onSave,
}: {
  initial: any;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        specializations: form.specializations
          ? (Array.isArray(form.specializations) ? form.specializations : form.specializations.split(',').map((s: string) => s.trim()).filter(Boolean))
          : [],
        experience: Number(form.experience) || 0,
        order: Number(form.order) || 0,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-bold text-[#0B2560]">{initial._id ? 'Edit Doctor' : 'Add Doctor'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Photo */}
          <ImageUpload
            label="Doctor Photo"
            folder="dr-youth-clinic/doctors"
            onUpload={(data) => set('photo', data)}
          />
          {form.photo?.url && (
            <div className="flex items-center gap-2 -mt-2">
              <img src={form.photo.url} alt="" className="w-10 h-10 rounded-lg object-cover" />
              <span className="text-xs text-gray-400">Current photo</span>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label>
            <input required value={form.name} onChange={(e) => set('name', e.target.value)}
              placeholder="Dr. Priya Sharma" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Title / Designation *</label>
            <input required value={form.title} onChange={(e) => set('title', e.target.value)}
              placeholder="Senior Dermatologist, MD" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Bio</label>
            <textarea rows={3} maxLength={500} value={form.bio} onChange={(e) => set('bio', e.target.value)}
              placeholder="Short professional bio..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
            <p className="text-[10px] text-gray-400 mt-1">{form.bio.length}/500</p>
          </div>

          {/* Specializations */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Specializations (comma-separated)</label>
            <input
              value={Array.isArray(form.specializations) ? form.specializations.join(', ') : form.specializations}
              onChange={(e) => set('specializations', e.target.value)}
              placeholder="Hair Restoration, PRP Therapy, Laser" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Experience + Order */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Experience (years)</label>
              <input type="number" min={0} max={50} value={form.experience} onChange={(e) => set('experience', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Display Order</label>
              <input type="number" min={0} value={form.order} onChange={(e) => set('order', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Clinic Location</label>
            <select value={form.location} onChange={(e) => set('location', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {CITIES.map((c) => <option key={c} value={c}>{CITY_LABELS[c]}</option>)}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">"All Locations" shows this doctor at every clinic.</p>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
            <button
              type="button"
              onClick={() => set('active', !form.active)}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.active ? 'bg-[#0B2560]' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-5' : ''}`} />
            </button>
            <span className="text-xs text-gray-600 font-medium">Active (visible on site)</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-[#0B2560] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#0d2d73] transition disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <><Loader size={14} className="animate-spin" /> Saving…</> : <><CheckCircle size={14} /> Save Doctor</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DoctorsAdminPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationFilter, setLocationFilter] = useState('');
  const [modal, setModal] = useState<any | null>(null); // null = closed, {} = new, {...} = edit

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/doctors');
      const d = await res.json();
      if (d.success) setDoctors(d.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const filtered = locationFilter
    ? doctors.filter((d) => d.location === locationFilter)
    : doctors;

  const toggle = async (id: string, val: boolean) => {
    setDoctors((prev) => prev.map((d) => d._id === id ? { ...d, active: val } : d));
    await fetch(`/api/admin/doctors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: val }),
    });
  };

  const deleteDoctor = async (id: string) => {
    if (!confirm('Delete this doctor?')) return;
    setDoctors((prev) => prev.filter((d) => d._id !== id));
    await fetch(`/api/admin/doctors/${id}`, { method: 'DELETE' });
  };

  const saveDoctor = async (data: any) => {
    if (data._id) {
      await fetch(`/api/admin/doctors/${data._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } else {
      await fetch('/api/admin/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }
    setModal(null);
    fetchDoctors();
  };

  return (
    <div className="p-8 max-w-6xl">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2560] flex items-center gap-2">
            <Stethoscope size={22} /> Doctors
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage specialist profiles shown on the homepage and service pages.
          </p>
        </div>
        <button
          onClick={() => setModal({})}
          className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d2d73] transition"
        >
          <Plus size={15} /> Add Doctor
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-[#0B2560]"
        >
          <option value="">All Locations ({doctors.length})</option>
          {CITIES.filter((c) => c !== 'all').map((c) => (
            <option key={c} value={c}>{CITY_LABELS[c]} ({doctors.filter((d) => d.location === c).length})</option>
          ))}
        </select>
      </div>

      {/* DOCTOR GRID */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
              <div className="flex gap-3"><div className="w-12 h-12 rounded-xl bg-gray-200" /><div className="space-y-1.5 flex-1"><div className="h-3 w-24 rounded bg-gray-200" /><div className="h-2.5 w-16 rounded bg-gray-100" /></div></div>
              <div className="space-y-1.5"><div className="h-2.5 w-full rounded bg-gray-100" /><div className="h-2.5 w-5/6 rounded bg-gray-100" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="grid">
          <EmptyState onAdd={() => setModal({})} />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => (
            <DoctorCard
              key={d._id}
              doctor={d}
              onToggle={toggle}
              onDelete={deleteDoctor}
              onEdit={(doc) => setModal({ ...doc, specializations: doc.specializations?.join(', ') || '' })}
            />
          ))}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {modal !== null && (
        <DoctorModal
          initial={modal}
          onClose={() => setModal(null)}
          onSave={saveDoctor}
        />
      )}
    </div>
  );
}
