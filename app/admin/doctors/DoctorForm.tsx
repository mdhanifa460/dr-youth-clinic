'use client';

import { useState } from 'react';
import { Save, Trash2, ExternalLink, Loader, CheckCircle } from 'lucide-react';
import ImageUpload from '@/app/admin/components/ImageUpload';

const CLINIC_LOCATIONS = [
  { value: 'all',        label: 'All Clinics',   note: 'shows at every location' },
  { value: 'chennai',    label: 'Chennai',        note: '' },
  { value: 'bangalore',  label: 'Bangalore',      note: '' },
  { value: 'coimbatore', label: 'Coimbatore',     note: '' },
  { value: 'kochi',      label: 'Kochi',          note: '' },
];

const EMPTY: Record<string, any> = {
  name: '', title: '', qualifications: '', bio: '',
  specializations: '', languages: '', experience: 0, order: 0,
  locations: ['all'], photo: { url: '', publicId: '' }, active: true,
};

function arrToStr(v: string[] | string): string {
  return Array.isArray(v) ? v.join(', ') : (v || '');
}

export default function DoctorForm({
  doctor,
  onSaved,
  onDeleted,
  onCancel,
}: {
  doctor: any | null;     // null = new doctor
  onSaved: (doc: any) => void;
  onDeleted: (id: string) => void;
  onCancel: () => void;
}) {
  const initial = doctor
    ? { ...doctor, specializations: arrToStr(doctor.specializations), languages: arrToStr(doctor.languages) }
    : EMPTY;

  const [form, setForm] = useState<Record<string, any>>(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const toggleLocation = (loc: string) => {
    setForm((f) => {
      const locs: string[] = f.locations || [];
      if (loc === 'all') {
        // Toggle All Clinics on/off — when turned off, individual ones become selectable
        return { ...f, locations: locs.includes('all') ? [] : ['all'] };
      }
      const filtered = locs.filter((l) => l !== 'all');
      return {
        ...f,
        locations: filtered.includes(loc)
          ? filtered.filter((l) => l !== loc)
          : [...filtered, loc],
      };
    });
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        specializations: form.specializations ? form.specializations.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        languages: form.languages ? form.languages.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        experience: Number(form.experience) || 0,
        order: Number(form.order) || 0,
        locations: form.locations?.length ? form.locations : ['all'],
      };

      const url = doctor?._id ? `/api/admin/doctors/${doctor._id}` : '/api/admin/doctors';
      const method = doctor?._id ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!data.success) { setError(data.message || 'Save failed'); return; }
      onSaved(data.data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!doctor?._id || !confirm(`Delete ${doctor.name}?`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/doctors/${doctor._id}`, { method: 'DELETE' });
      onDeleted(doctor._id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="font-bold text-[#0B2560] text-sm">
            {doctor ? `Editing: ${doctor.name}` : 'New Doctor'}
          </h2>
          {doctor?._id && (
            <a href={`/doctors/${doctor._id}`} target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-[#3B82C4] hover:underline flex items-center gap-1 mt-0.5">
              View profile on site <ExternalLink size={9} />
            </a>
          )}
        </div>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 transition">✕ Close</button>
      </div>

      {/* Form body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        {/* Photo */}
        <ImageUpload label="Profile Photo" folder="dr-youth-clinic/doctors" onUpload={(d) => set('photo', d)} />
        {form.photo?.url && (
          <div className="flex items-center gap-3 -mt-3">
            <img src={form.photo.url} alt="" className="w-12 h-12 rounded-xl object-cover" />
            <span className="text-xs text-gray-400">Current photo</span>
          </div>
        )}

        {/* Name + Title */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label>
            <input required value={form.name} onChange={(e) => set('name', e.target.value)}
              placeholder="DR Priya Sharma" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Designation *</label>
            <input required value={form.title} onChange={(e) => set('title', e.target.value)}
              placeholder="Senior Dermatologist" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Qualifications */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Qualifications</label>
          <input value={form.qualifications} onChange={(e) => set('qualifications', e.target.value)}
            placeholder="MBBS, MD (Dermatology), DNB" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Bio</label>
          <textarea rows={4} maxLength={2000} value={form.bio} onChange={(e) => set('bio', e.target.value)}
            placeholder="Write a professional biography — background, expertise, approach to patient care..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-y" />
          <p className="text-[10px] text-gray-400 mt-1">{(form.bio || '').length}/2000 characters</p>
        </div>

        {/* Specializations + Languages */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Specializations</label>
            <input value={form.specializations} onChange={(e) => set('specializations', e.target.value)}
              placeholder="Hair PRP, Laser, Acne" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <p className="text-[10px] text-gray-400 mt-1">Comma-separated</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Languages</label>
            <input value={form.languages} onChange={(e) => set('languages', e.target.value)}
              placeholder="Tamil, English, Hindi" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <p className="text-[10px] text-gray-400 mt-1">Comma-separated</p>
          </div>
        </div>

        {/* Experience + Order */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Experience (years)</label>
            <input type="number" min={0} max={50} value={form.experience} onChange={(e) => set('experience', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Display Order</label>
            <input type="number" min={0} value={form.order} onChange={(e) => set('order', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <p className="text-[10px] text-gray-400 mt-1">Lower = shown first</p>
          </div>
        </div>

        {/* Locations (multi-select) */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">Clinic Locations</label>
          <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {CLINIC_LOCATIONS.map((loc) => {
              const selected = (form.locations || []).includes(loc.value);
              const isAllSelected = (form.locations || []).includes('all');
              const disabled = loc.value !== 'all' && isAllSelected;
              return (
                <label key={loc.value} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition ${
                  disabled ? 'opacity-40 cursor-not-allowed bg-gray-50' : selected ? 'bg-[#f0f5ff]' : 'hover:bg-gray-50'
                }`}>
                  <input type="checkbox" checked={selected} disabled={disabled}
                    onChange={() => !disabled && toggleLocation(loc.value)}
                    className="rounded border-gray-300 text-[#0B2560] focus:ring-[#0B2560]" />
                  <span className="text-sm font-medium text-gray-700">{loc.label}</span>
                  {loc.note && <span className="text-xs text-gray-400">— {loc.note}</span>}
                  {loc.value === 'all' && isAllSelected && (
                    <span className="ml-auto text-[10px] text-[#3B82C4] font-bold">ACTIVE</span>
                  )}
                  {loc.value !== 'all' && selected && !isAllSelected && (
                    <span className="ml-auto text-[10px] text-emerald-500 font-bold">ACTIVE</span>
                  )}
                </label>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            Uncheck "All Clinics" first, then select specific branches.
          </p>
        </div>

        {/* Active */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <button type="button" onClick={() => set('active', !form.active)}
            className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${form.active ? 'bg-[#0B2560]' : 'bg-gray-200'}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-5' : ''}`} />
          </button>
          <span className="text-sm font-medium text-gray-600">Active — visible on website</span>
        </label>
      </div>

      {/* Footer actions */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-2 shrink-0 bg-white">
        {doctor?._id && (
          <button onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 font-semibold transition disabled:opacity-50 border border-red-100 hover:border-red-300 px-3 py-2 rounded-xl">
            {deleting ? <Loader size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
          </button>
        )}
        <button onClick={handleSave} disabled={saving}
          className="ml-auto flex items-center gap-2 bg-[#0B2560] text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-[#0d2d73] transition disabled:opacity-60">
          {saving ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={14} />}
          {saving ? 'Saving…' : 'Save Doctor'}
        </button>
      </div>
    </div>
  );
}
