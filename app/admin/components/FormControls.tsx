'use client';

import { Plus, X } from 'lucide-react';

// ─── Shared admin form primitives ──────────────────────────────────────────
// Canonical versions of the field/array/image editors used across the admin
// page builders (landing pages, about page) and CRUD forms (videos, etc.) —
// import from here instead of adding another local copy.

export function FieldInput({
  label, value, onChange, type = 'text', placeholder = '',
}: {
  label: string; value: any; onChange: (v: any) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 resize-none"
        />
      ) : (
        <input
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
        />
      )}
    </div>
  );
}

export function StringArrayEditor({
  label, items, onChange,
}: {
  label: string; items: string[]; onChange: (items: string[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
        <button type="button" onClick={() => onChange([...items, ''])}
          className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline">
          <Plus size={10} /> Add
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              value={item}
              onChange={(e) => { const next = [...items]; next[i] = e.target.value; onChange(next); }}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
            />
            <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-gray-300 hover:text-red-500 shrink-0">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Generic editor for arrays of small objects (icon/title/desc/time/label style rows)
export function ObjectArrayEditor({
  label, items, onChange, fields, defaultItem,
}: {
  label: string;
  items: Record<string, any>[];
  onChange: (items: Record<string, any>[]) => void;
  fields: { key: string; placeholder: string; type?: 'text' | 'textarea'; width?: 'full' | 'sm' }[];
  defaultItem: Record<string, any>;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
        <button type="button" onClick={() => onChange([...items, { ...defaultItem }])}
          className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline">
          <Plus size={10} /> Add
        </button>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Item {i + 1}</span>
              <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="text-gray-300 hover:text-red-500"><X size={13} /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {fields.map((f) => (
                f.type === 'textarea' ? (
                  <textarea key={f.key} value={item[f.key] || ''} rows={2}
                    onChange={(e) => { const n = [...items]; n[i] = { ...n[i], [f.key]: e.target.value }; onChange(n); }}
                    placeholder={f.placeholder}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none resize-none" />
                ) : (
                  <input key={f.key} value={item[f.key] || ''}
                    onChange={(e) => { const n = [...items]; n[i] = { ...n[i], [f.key]: e.target.value }; onChange(n); }}
                    placeholder={f.placeholder}
                    className={`border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none ${f.width === 'sm' ? 'w-20' : 'flex-1'}`} />
                )
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ImagePicker({
  label, value, onChange, openGallery,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  openGallery: (cb: (url: string) => void) => void;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">{label}</label>
      {value && (
        <div className="mb-2 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
          <img src={value} alt="" className="w-full object-cover" style={{ height: '80px' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}
      <div className="flex gap-2 items-center">
        <span className="flex-1 text-xs text-gray-400 truncate min-w-0">{value || 'No image selected'}</span>
        <button type="button" onClick={() => openGallery(onChange)}
          className="shrink-0 flex items-center gap-1.5 bg-[#0B2560] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#1a3a7a] transition whitespace-nowrap">
          📷 Gallery
        </button>
        {value && (
          <button type="button" onClick={() => onChange('')}
            className="shrink-0 text-gray-400 hover:text-red-500 transition p-0.5"><X size={14} /></button>
        )}
      </div>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste URL directly..."
        className="w-full mt-2 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 text-gray-500 placeholder-gray-300"
      />
    </div>
  );
}
