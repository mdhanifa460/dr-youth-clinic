'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Stethoscope, MapPin, Settings, Loader, CheckCircle } from 'lucide-react';
import DoctorForm from './DoctorForm';

const PAGE_FIELDS = [
  { key: 'heroHeading',    label: 'Hero Heading',         hint: 'Last word gets gold colour', rows: 1 },
  { key: 'heroSubheading', label: 'Hero Subheading',      hint: 'Paragraph under the heading', rows: 2 },
  { key: 'gridHeading',    label: 'Section Heading',      hint: 'Above the doctor grid', rows: 1 },
  { key: 'gridSubheading', label: 'Section Subheading',   hint: 'Small line under section heading', rows: 1 },
  { key: 'ctaHeading',     label: 'Bottom CTA Heading',   hint: 'Navy CTA strip at page bottom', rows: 1 },
  { key: 'ctaBody',        label: 'Bottom CTA Body',      hint: 'Paragraph in the CTA strip', rows: 2 },
];

const PAGE_DEFAULTS: Record<string, string> = {
  heroHeading:    'Meet Our Expert Specialist Team',
  heroSubheading: 'Board-certified dermatologists, trichologists and aesthetic physicians committed to delivering safe, natural and lasting results.',
  gridHeading:    'Trusted by 25,000+ Patients',
  gridSubheading: 'Filter by clinic location below',
  ctaHeading:     'Consult a Specialist Today',
  ctaBody:        'Book a free initial consultation — zero commitment, just an honest assessment of your concerns.',
};

function PageContentPanel() {
  const [form, setForm] = useState<Record<string, string>>(PAGE_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/doctors/page-content')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Object.keys(d.data).length) setForm({ ...PAGE_DEFAULTS, ...d.data });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setError(''); setSaving(true); setSaved(false);
    try {
      const res = await fetch('/api/admin/doctors/page-content', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!d.success) { setError(d.message || 'Save failed'); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader size={20} className="animate-spin text-gray-300" />
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100 shrink-0">
        <h2 className="font-bold text-[#0B2560] text-sm">Meet Our Doctors — Page Content</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Controls text shown on <a href="/doctors" target="_blank" rel="noopener noreferrer" className="text-[#3B82C4] hover:underline">/doctors</a> public page
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        {PAGE_FIELDS.map(({ key, label, hint, rows }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
            {rows > 1 ? (
              <textarea rows={rows} value={form[key] || ''} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none" />
            ) : (
              <input value={form[key] || ''} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            )}
            <p className="text-[10px] text-gray-400 mt-1">{hint}</p>
          </div>
        ))}

        {/* Live preview hint */}
        <div className="rounded-xl bg-[#f0f5ff] border border-blue-50 px-4 py-3">
          <p className="text-xs font-semibold text-[#0B2560] mb-1">How it looks on the website</p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>• <strong>Hero:</strong> {(form.heroHeading || '').split(' ').slice(0, -1).join(' ')} <span className="text-[#F5A623]">{(form.heroHeading || '').split(' ').at(-1)}</span></p>
            <p>• <strong>Grid:</strong> {form.gridHeading}</p>
            <p>• <strong>CTA:</strong> {form.ctaHeading}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-100 shrink-0">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-[#0B2560] text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-[#0d2d73] transition disabled:opacity-60 ml-auto">
          {saving ? <Loader size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : <CheckCircle size={14} />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Page Content'}
        </button>
      </div>
    </div>
  );
}

const LOCATION_TABS = [
  { value: '',            label: 'All' },
  { value: 'chennai',    label: 'Chennai' },
  { value: 'bangalore',  label: 'Bangalore' },
  { value: 'coimbatore', label: 'Coimbatore' },
  { value: 'kochi',      label: 'Kochi' },
];

function countForLocation(doctors: any[], loc: string) {
  if (!loc) return doctors.length;
  return doctors.filter((d) => d.locations?.includes(loc) || d.locations?.includes('all')).length;
}

function DoctorListCard({ doc, isSelected, onClick }: { doc: any; isSelected: boolean; onClick: () => void }) {
  const initials = doc.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const locationLabel = doc.locations?.includes('all') ? 'All Clinics' : doc.locations?.join(', ');

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 transition-all ${
        isSelected ? 'bg-[#f0f5ff] border-l-2 border-l-[#0B2560]' : 'hover:bg-gray-50 border-l-2 border-l-transparent'
      }`}
    >
      {doc.photo?.url ? (
        <img src={doc.photo.url} alt={doc.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-xl bg-[#0B2560]/10 flex items-center justify-center shrink-0 text-[#0B2560] text-xs font-bold">
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[#0B2560] truncate leading-snug">{doc.name}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">{doc.title}</p>
        <div className="flex items-center gap-1 mt-1">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${doc.active ? 'bg-green-400' : 'bg-gray-300'}`} />
          <span className="text-[10px] text-gray-400 truncate capitalize">{locationLabel}</span>
        </div>
      </div>
    </button>
  );
}

function EmptyPanel({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-[#f0f5ff] flex items-center justify-center mb-4">
        <Stethoscope size={28} className="text-[#0B2560]/30" />
      </div>
      <p className="font-semibold text-gray-500 mb-1">Select a doctor to edit</p>
      <p className="text-xs text-gray-400 mb-5">or add a new specialist profile</p>
      <button onClick={onNew}
        className="flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0d2d73] transition">
        <Plus size={14} /> Add Doctor
      </button>
    </div>
  );
}

export default function DoctorsAdminPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationTab, setLocationTab] = useState('');
  // undefined = nothing selected, null = new doctor, object = editing
  const [selected, setSelected] = useState<any | undefined>(undefined);
  const [mobileView, setMobileView] = useState<'list' | 'form'>('list');
  const [pageMode, setPageMode] = useState(false);

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

  const filteredDoctors = locationTab
    ? doctors.filter((d) => d.locations?.includes(locationTab) || d.locations?.includes('all'))
    : doctors;

  const openDoctor = (doc: any) => { setSelected(doc); setMobileView('form'); };
  const openNew    = ()         => { setSelected(null);  setMobileView('form'); };
  const closeForm  = ()         => { setSelected(undefined); setMobileView('list'); };

  const onSaved = (saved: any) => {
    setDoctors((prev) => {
      const idx = prev.findIndex((d) => d._id === saved._id);
      return idx >= 0 ? prev.map((d) => d._id === saved._id ? saved : d) : [saved, ...prev];
    });
    setSelected(saved);
  };

  const onDeleted = (id: string) => {
    setDoctors((prev) => prev.filter((d) => d._id !== id));
    closeForm();
  };

  const formOpen = selected !== undefined;

  return (
    <div className="-m-6 flex flex-col h-screen bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <Stethoscope size={20} className="text-[#0B2560]" />
          <h1 className="text-lg font-bold text-[#0B2560]">Doctors</h1>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{doctors.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setPageMode((p) => !p); setSelected(undefined); }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition border ${
              pageMode ? 'bg-[#0B2560] text-white border-[#0B2560]' : 'border-gray-200 text-gray-500 hover:border-[#0B2560] hover:text-[#0B2560]'
            }`}>
            <Settings size={13} /> Page Content
          </button>
          <button onClick={() => { openNew(); setPageMode(false); }}
            className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d2d73] transition">
            <Plus size={14} /> Add Doctor
          </button>
        </div>
      </div>

      {/* Split panel */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: doctor list */}
        <div className={`${
          mobileView === 'form' ? 'hidden lg:flex' : 'flex'
        } flex-col w-full lg:w-72 xl:w-80 border-r border-gray-100 bg-white shrink-0 overflow-hidden`}>

          {/* Location tabs */}
          <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-100 px-3 pt-3 shrink-0 gap-0.5">
            {LOCATION_TABS.map((tab) => {
              const count = countForLocation(doctors, tab.value);
              const active = locationTab === tab.value;
              return (
                <button key={tab.value} onClick={() => setLocationTab(tab.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap transition rounded-t-lg border-b-2 -mb-px ${
                    active ? 'text-[#0B2560] border-[#0B2560] bg-[#f0f5ff]' : 'text-gray-400 border-transparent hover:text-gray-600'
                  }`}>
                  {tab.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-[#0B2560] text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-1">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 rounded bg-gray-200" />
                      <div className="h-2 w-1/2 rounded bg-gray-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MapPin size={28} className="mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No doctors at this location</p>
                <button onClick={openNew} className="mt-3 text-xs text-[#3B82C4] font-semibold hover:underline">Add one →</button>
              </div>
            ) : (
              filteredDoctors.map((doc) => (
                <DoctorListCard key={doc._id} doc={doc} isSelected={selected?._id === doc._id} onClick={() => openDoctor(doc)} />
              ))
            )}
          </div>
        </div>

        {/* RIGHT: page content editor OR doctor form / empty state */}
        <div className={`${mobileView === 'list' && !formOpen && !pageMode ? 'hidden lg:flex' : 'flex'} flex-col flex-1 overflow-hidden bg-white`}>
          {pageMode ? (
            <PageContentPanel />
          ) : formOpen ? (
            <DoctorForm key={selected?._id ?? 'new'} doctor={selected} onSaved={onSaved} onDeleted={onDeleted} onCancel={closeForm} />
          ) : (
            <EmptyPanel onNew={openNew} />
          )}
        </div>
      </div>
    </div>
  );
}
